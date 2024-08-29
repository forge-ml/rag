import { Embedder, EmbedderOptions, Chunk, Embedding } from "../types";
import OpenAI from "openai";
import { estimateTokensByLength } from "../utils/tokenEstimate";

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

    // Generate embeddings for the truncated chunks
    const embeddings = await this.generateEmbeddingBatch(
      truncatedChunks.map((chunk) => chunk.text)
    );

    return truncatedChunks.map((chunk, index) => ({
      chunkId: chunk.forgeMetadata.chunkId,
      embedding: embeddings[index],
    }));
  }
}

export default OpenAIEmbedder;
