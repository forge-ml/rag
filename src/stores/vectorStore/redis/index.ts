import {
  createClient,
  RedisClientType,
  RediSearchSchema,
  SchemaFieldTypes,
  VectorAlgorithms,
} from "redis";
import { Embedding, VectorStore } from "../../../types";
const INDEX_KEY = "idx:chunks";
const CHUNK_KEY_PREFIX = `chunks`;

// small model is 1536, large model is 3072
enum DIM {
  OPENAI_SMALL = 1536,
  OPENAI_LARGE = 3072,
  NOMIC_V1_5 = 768,
}

//@TODO pass in the user's embedding model and adjust the DIM accordingly
const GenericIndex: RediSearchSchema = {
  "$.chunkEmbeddings": {
    type: SchemaFieldTypes.VECTOR,
    TYPE: "FLOAT32",
    ALGORITHM: VectorAlgorithms.FLAT,
    DIM: DIM.NOMIC_V1_5, // this needs to be set to the dimesension set by the embedding model, 3072 for text-embedding-3-large or 1536 for text-embedding-3-small, 768 for nomic v1.5 embedder
    DISTANCE_METRIC: "L2",
    AS: "chunkEmbeddings",
  },
  "$.chunkId": {
    type: SchemaFieldTypes.TEXT,
    NOSTEM: true,
    SORTABLE: true,
    AS: "chunkId",
  },
  "$.documentId": {
    type: SchemaFieldTypes.TEXT,
    NOSTEM: true,
    SORTABLE: true,
    AS: "documentId",
  },
};

class RedisVectorStore implements VectorStore {
  client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({ url });
    this.client.connect().catch(console.error);
  }

  async createIndex() {
    try {
      await this.client.ft.dropIndex(INDEX_KEY).catch(() => {});
    } catch (indexErr) {
      console.error(indexErr);
    }
    await this.client.ft.create(INDEX_KEY, GenericIndex, {
      ON: "JSON",
      PREFIX: CHUNK_KEY_PREFIX,
    });
  }

  async addEmbedding(embedding: Embedding) {
    return this.client.json.set(
      `${CHUNK_KEY_PREFIX}:${embedding.chunkId}`,
      "$",
      {
        chunkId: embedding.chunkId,
        documentId: embedding.documentId,
        chunkEmbeddings: embedding.embedding,
      }
    );
  }

  async storeEmbeddings(embeddings: Embedding[]) {
    await Promise.all(
      embeddings.map((embedding) => this.addEmbedding(embedding))
    );
  }

  async queryEmbeddings(params: {
    query: number[];
    k: number;
    documentIds?: string[];
  }) {
    const results = await this.knnSearchEmbeddings({
      inputVector: params.query,
      k: params.k,
      documentIds: params.documentIds,
    });

    return results.documents.map((doc) => ({
      chunkId: doc.value.chunkId as string,
      documentId: doc.value.documentId as string,
      score: doc.value.score as number,
    }));
  }

  async knnSearchEmbeddings({
    inputVector,
    k,
    documentIds,
  }: {
    inputVector: number[];
    k: number;
    documentIds?: string[];
  }) {
    try {
      const filter = documentIds ? `(@documentId:(${documentIds.map(id => `"${id}"`).join(' ')}))` : "*";
      const query = `${filter}=>[KNN ${k} @chunkEmbeddings $searchBlob AS score]`;

      const searchParams = {
        PARAMS: {
          searchBlob: Buffer.from(new Float32Array(inputVector).buffer),
        },
        RETURN: ["score", "chunkId", "documentId"],
        SORTBY: {
          BY: "score",
        },
        DIALECT: 2,
      };

      const results = await this.client.ft.search(INDEX_KEY, query, searchParams);
      
      if (!results || !results.documents) {
        throw new Error('No results returned from Redis search');
      }

      return results;
    } catch (error) {
      console.error('Error in knnSearchEmbeddings:', error);
      throw error;
    }
  }
}

export default RedisVectorStore;
