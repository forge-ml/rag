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

const GenericIndex: RediSearchSchema = {
  "$.chunkEmbeddings": {
    type: SchemaFieldTypes.VECTOR,
    TYPE: "FLOAT32",
    ALGORITHM: VectorAlgorithms.FLAT,
    DIM: 3072, // this needs to be set to the dimesension set by the embedding model, 3072 for text-embedding-3-large or 1536 for text-embedding-3-small
    DISTANCE_METRIC: "COSINE",
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
      await this.client.ft.dropIndex(INDEX_KEY);
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
