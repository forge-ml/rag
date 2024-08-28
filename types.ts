interface Metadata {
  documentId: string;
  page?: number; // the page number of the document
}

interface ChunkMetadata {
  documentId: string;
  chunkId: string;
}

interface Document {
  forgeMetadata: Metadata; // rename built in metadata
  metadata: Record<string, any>; // user specified metadata
  text: string;
}

interface Chunk {
  id: string;
  forgeMetadata: ChunkMetadata;
  metadata: Record<string, any>;
  text: string;
}

interface Embedding {
  chunkId: string;
  embedding: number[];
}

interface ScoredEmbedding {
  chunkId: string;
  score: number;
}

interface VectorStore {
  storeEmbeddings: (embeddings: Embedding[]) => Promise<void>;
  // retrieveEmbeddings: (chunkIds: string[]) => Promise<Embedding[]>;
  queryEmbeddings: (query: number[]) => Promise<ScoredEmbedding[]>;
  // deleteEmbeddings: (chunkIds: string[]) => Promise<void>;
}

interface Embedder {
  generateEmbedding: (text: string) => Promise<number[]>;
  embedChunks: (chunks: Chunk[]) => Promise<Embedding[]>;
}

enum ChunkingStrategy {
  BY_PARAGRAPH = "by_paragraph",
  BY_SENTENCE = "by_sentence",
  BY_ITEM_IN_LIST = "by_item_in_list",
  BY_CUSTOM_DELIMITER = "by_custom_delimiter",
}

export {
    Chunk,
    ChunkingStrategy,
    Document,
    Embedding,
    ScoredEmbedding,
    VectorStore,
    Embedder,
}