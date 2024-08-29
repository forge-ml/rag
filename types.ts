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

//@TODO find a better name
type RelevantChunk = {
  chunkId: string;
  text: string;
  score: number;
};

interface VectorStore {
  storeEmbeddings: (embeddings: Embedding[]) => Promise<void>;
  // retrieveEmbeddings: (chunkIds: string[]) => Promise<Embedding[]>;
  queryEmbeddings: (query: number[], k: number) => Promise<ScoredEmbedding[]>;
  // deleteEmbeddings: (chunkIds: string[]) => Promise<void>;
}

/**
 * What do we need from a doc store
 * CRUD on documents
 * this means we store names/ids and be able to provide those to the user?
 *
 * Store each documents chunks?
 *
 * For now lets just say we store a single document at a time - so we can CRUD over one doc
 * Later one we need to add document ids and way provide them to the user
 * User "initializes a document" - from ragger document and its chunks get stored in doc store while embeddings get stored in vector store
 *
 * Use document id from vector store to get chunks
 *
 */

type DocStore = {
  storeDocument: (text: string) => Promise<void>;
  retrieveDocument: () => Promise<string>;
  updateDocument: (text: string) => Promise<void>;
  deleteDocument: () => Promise<void>;

  storeChunks: (chunks: Chunk[]) => Promise<void>;
  retrieveChunks: () => Promise<Chunk[]>;
  updateChunks: (chunks: Chunk[]) => Promise<void>;
  deleteChunks: () => Promise<void>;

  queryFromEmbeddings: (
    embeddings: ScoredEmbedding[]
  ) => Promise<RelevantChunk[]>; // given a query embedding, return the chunks that are most relevant
};

type StoresClass = {
  vectorStore: VectorStore;
  docStore: DocStore;
};

interface Embedder {
  generateEmbedding: (text: string) => Promise<number[]>;
  embedChunks: (chunks: Chunk[]) => Promise<Embedding[]>;
}

type EmbedderOptions = {
  type: "openai" | "nomic";
  apiKey: string;
};

enum ChunkingStrategy {
  BY_PARAGRAPH = "by_paragraph",
  BY_SENTENCE = "by_sentence",
  BY_ITEM_IN_LIST = "by_item_in_list",
  BY_CUSTOM_DELIMITER = "by_custom_delimiter",
}

type InitializeDocumentOptions =
  | {
      strategy: Exclude<ChunkingStrategy, ChunkingStrategy.BY_CUSTOM_DELIMITER>;
    }
  | {
      strategy: ChunkingStrategy.BY_CUSTOM_DELIMITER;
      delimiter: string;
    };

export {
  Chunk,
  ChunkingStrategy,
  Document,
  Embedding,
  ScoredEmbedding,
  VectorStore,
  Embedder,
  EmbedderOptions,
  InitializeDocumentOptions,
  StoresClass,
  DocStore,
  RelevantChunk,
};
