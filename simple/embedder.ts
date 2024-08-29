import OpenAI from "openai";
import { Chunk, Embedder, Embedding } from "../types";
import { estimateTokens, estimateTokensByLength } from "../utils/tokenEstimate";
import { Semaphore, Throttler } from "../utils/semaphore";
import { embed } from "@nomic-ai/atlas";

type EmbedderOptions = {
  type: "openai" | "nomic";
  apiKey: string;
};

class NomicEmbedder implements Embedder {
  private apiKey: string;
  //@TODO set api key with AtlasUser and make api calls instead

  constructor({ apiKey }: EmbedderOptions) {
    this.apiKey = apiKey;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await embed(
      text,
      { model: "nomic-embed-text-v1.5" },
      this.apiKey
    );
    return embedding;
  }

  async embedChunks(chunks: Chunk[]): Promise<Embedding[]> {
    const embeddings = await embed(
      chunks.map((chunk) => chunk.text),
      { model: "nomic-embed-text-v1.5" },
      this.apiKey
    );

    const embeddedChunks = chunks.map((chunk, index) => ({
      chunkId: chunk.forgeMetadata.chunkId,
      embedding: embeddings[index],
    }));
    return embeddedChunks;
  }
}

class OpenAIEmbedder implements Embedder {
  private openai: OpenAI;

  constructor({ apiKey }: EmbedderOptions) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate an embedding for a given text.
   * @param text The text to generate an embedding for.
   * @returns The embedding for the text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await this.openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });
    return embedding.data[0].embedding;
  }

  async generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
    const batchSize = 80;
    const batches = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    const embeddings = await Promise.all(
      batches.map(async (batch) => {
        const response = await this.openai.embeddings.create({
          model: "text-embedding-3-large",
          input: batch.filter((text) => !text.includes("$")),
        });
        return response.data.map((embedding) => embedding.embedding);
      })
    );

    return embeddings.flat();
  }

  /**
   * Embed an array of chunks.
   * @param chunks The chunks to embed.
   * @returns The embeddings for the chunks.
   */
  async embedChunks(chunks: Chunk[]): Promise<Embedding[]> {
    console.log("Embedding chunks:", chunks.length, chunks[0].text.length);

    // Truncate chunks to 800,000 tokens (rate limit is 1,000,000 tokens)
    const { chunks: truncatedChunks, totalLength } = chunks.reduce(
      (acc, chunk, index) => {
        const currentChunkLength = acc.totalLength + chunk.text.length;
        if (
          estimateTokensByLength(currentChunkLength) > 800000 ||
          index > 2900
        ) {
          return acc;
        }
        acc.chunks.push(chunk);
        acc.totalLength = currentChunkLength;
        return acc;
      },
      { chunks: [] as Chunk[], totalLength: 0 }
    );

    console.log(
      "Truncated chunks:",
      truncatedChunks.length,
      truncatedChunks[0].text.length
    );

    // Generate embeddings for the truncated chunks
    const embeddings = await this.generateEmbeddingBatch(
      truncatedChunks.map((chunk) => chunk.text)
    );

    console.log("Embeddings:", embeddings.length, embeddings[0].length);

    return truncatedChunks.map((chunk, index) => ({
      chunkId: chunk.forgeMetadata.chunkId,
      embedding: embeddings[index],
    }));
  }
}

export { OpenAIEmbedder, NomicEmbedder };
