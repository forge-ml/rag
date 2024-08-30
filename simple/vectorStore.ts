import { Embedding, VectorStore, ScoredEmbedding } from "../types";

import { createClient, RedisClientType } from "redis";

//@TODO: delete this file? doesn't seem necessary since we have vectorStore/redis/index.ts

type VectorStoreQueryOptions = {
  k: number;
};

class RedisVectorStore implements VectorStore {
  private client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({ url });
    this.client.connect().catch(console.error);
  }

  async storeEmbeddings(embeddings: Embedding[]): Promise<void> {
    // Implementation to store embeddings in Redis
  }

  async retrieveEmbeddings(chunkIds: string[]): Promise<Embedding[]> {
    // Implementation to retrieve embeddings from Redis
    return [];
  }

  async queryEmbeddings(
    vector: number[],
    options?: VectorStoreQueryOptions
  ): Promise<ScoredEmbedding[]> {
    // Implementation to query embeddings in Redis
    return [];
  }

  async deleteEmbeddings(chunkIds: string[]): Promise<void> {
    // Implementation to delete embeddings from Redis
  }
}

const createRedisVectorStore = (url: string): VectorStore => {
  return new RedisVectorStore(url);
};
