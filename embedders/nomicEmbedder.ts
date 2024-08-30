import { embed } from "@nomic-ai/atlas";
import { Embedder, EmbedderOptions, Chunk, Embedding } from "../types";

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

  async embedChunks(chunks: Chunk[], documentId: string): Promise<Embedding[]> {
    const embeddings = await embed(
      chunks.map((chunk) => chunk.text),
      { model: "nomic-embed-text-v1.5" },
      this.apiKey
    );

    const embeddedChunks = chunks.map((chunk, index) => ({
      chunkId: chunk.forgeMetadata.chunkId,
      documentId: documentId,
      embedding: embeddings[index],
    }));
    return embeddedChunks;
  }
}

export default NomicEmbedder;
