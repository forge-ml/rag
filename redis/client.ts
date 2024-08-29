import {
  createClient,
  RedisClientType,
  RediSearchSchema,
  SchemaFieldTypes,
  VectorAlgorithms,
} from "redis";
import { Chunk } from "../types";

const INDEX_KEY = "idx:chunks";
const CHUNK_KEY_PREFIX = `chunks`;

// small model is 1536, large model is 3072
enum DIM {
  OPENAI_SMALL = 1536,
  OPENAI_LARGE = 3072,
  NOMIC_V1_5 = 768,
}

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
};

class RedisVectorStore {
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

  async addEmbedding(embedding: { chunkId: string; embedding: number[] }) {
    return this.client.json.set(
      `${CHUNK_KEY_PREFIX}:${embedding.chunkId}`,
      "$",
      {
        chunkId: embedding.chunkId,
        chunkEmbeddings: embedding.embedding,
      }
    );
  }

  async storeEmbeddings(
    embeddings: { chunkId: string; embedding: number[] }[]
  ) {
    await Promise.all(
      embeddings.map((embedding) => this.addEmbedding(embedding))
    );
  }

  async queryEmbeddings(query: number[], k: number = 3) {
    const results = await this.knnSearchEmbeddings({
      inputVector: query,
      k,
    });

    return results.documents.map((doc) => ({
      chunkId: doc.value.chunkId as string,
      score: doc.value.score as number,
    }));
  }

  async knnSearchEmbeddings({
    inputVector,
    k,
  }: {
    inputVector: number[];
    k: number;
  }) {
    //console.log(inputVector);
    const query = `*=>[KNN ${k} @chunkEmbeddings $searchBlob AS score]`;
    return this.client.ft.search(INDEX_KEY, query, {
      PARAMS: {
        searchBlob: Buffer.from(new Float32Array(inputVector).buffer),
      },
      RETURN: ["score", "chunkId"],
      SORTBY: {
        BY: "score",
        // DIRECTION: "DESC"
      },
      DIALECT: 2,
    });
  }
}

export default RedisVectorStore;
