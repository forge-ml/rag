import {
  createClient,
  RedisClientType,
  RediSearchSchema,
  SchemaFieldTypes,
  VectorAlgorithms,
} from "redis";
import { Embedding, VectorStore } from "../../../types";
import { VECTOR_MODEL_DIM } from "../types";
const INDEX_KEY = "idx:chunks";
const CHUNK_KEY_PREFIX = `chunks`;



//@TODO pass in the user's embedding model and adjust the DIM accordingly
const GenericIndex: (dim: VECTOR_MODEL_DIM) => RediSearchSchema = (dim: VECTOR_MODEL_DIM) => ({
  "$.chunkEmbeddings": {
    type: SchemaFieldTypes.VECTOR,
    TYPE: "FLOAT32",
    ALGORITHM: VectorAlgorithms.FLAT,
    DIM: dim, // this needs to be set to the dimesension set by the embedding model, 3072 for text-embedding-3-large or 1536 for text-embedding-3-small, 768 for nomic v1.5 embedder
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
});


const defaultCreateIndexOpts = {
  dim: VECTOR_MODEL_DIM.NOMIC_V1_5,
}

class RedisVectorStore implements VectorStore {
  client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({ url });
    this.client.connect().catch(console.error);
  }

  async createIndex(opts = defaultCreateIndexOpts) {
    try {
      await this.client.ft.dropIndex(INDEX_KEY).catch(() => {});
    } catch (indexErr) {
      console.error(indexErr);
    }
    await this.client.ft.create(INDEX_KEY, GenericIndex(opts.dim), {
      ON: "JSON",
      PREFIX: CHUNK_KEY_PREFIX,
    });
  }

  async addEmbedding(embedding: Embedding) {
    return this.client.json.set(
      `${CHUNK_KEY_PREFIX}:${embedding.chunkId}`,
      "$",
      {
        chunkId: embedding.chunkId.replace(/[^a-zA-Z0-9]/g, "."),
        documentId: embedding.documentId.replace(/[^a-zA-Z0-9]/g, "."),
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
      chunkId: doc.value.chunkId?.toString().replace(/[^a-zA-Z0-9]/g, "-") || "",
      documentId: doc.value.documentId?.toString().replace(/[^a-zA-Z0-9]/g, "-") || "",
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
      let filter = "*";
      if (documentIds && documentIds.length > 0) {
        const escapedIds = documentIds.map(id => id.replace(/[^a-zA-Z0-9]/g, "."));
        filter = `@documentId:(${escapedIds.join('|')})`;
      }
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
