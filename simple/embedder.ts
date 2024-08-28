import OpenAI from "openai";
import { Chunk, Embedder, Embedding } from "../types";

type EmbedderOptions = {
  type: "openai";
  apiKey: string;
};

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

  /**
   * Embed an array of chunks.
   * @param chunks The chunks to embed.
   * @returns The embeddings for the chunks.
   */
  async embedChunks(chunks: Chunk[]): Promise<Embedding[]> {
    return Promise.all(chunks.map(async (chunk) => {
      return {
        chunkId: chunk.forgeMetadata.chunkId,
        embedding: await this.generateEmbedding(chunk.text),
      };
    }));
  }
}

export default OpenAIEmbedder;
