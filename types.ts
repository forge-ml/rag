interface Metadata {
  documentId: string;
  page?: number; // the page number of the document
}

interface ChunkMetadata {
  documentId: string;
  chunkId: string;
}

interface DocumentClass {
  getMetadata: () => Metadata;
  getText: () => string;
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
  storeDocument: (document: DocumentClass) => Promise<void>;
  retrieveDocumentText: (document: DocumentClass) => Promise<string>;
  updateDocument: (text: string, document: DocumentClass) => Promise<void>;
  deleteDocument: (document: DocumentClass) => Promise<void>;

  storeChunks: (chunks: Chunk[], document: DocumentClass) => Promise<void>;
  retrieveChunks: (document: DocumentClass) => Promise<Chunk[]>;
  updateChunks: (chunks: Chunk[], document: DocumentClass) => Promise<void>;
  deleteChunks: (document: DocumentClass) => Promise<void>;

  queryFromEmbeddings: (
    embeddings: ScoredEmbedding[],
    document: DocumentClass
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
  DocumentClass,
  Embedding,
  ScoredEmbedding,
  VectorStore,
  Embedder,
  EmbedderOptions,
  InitializeDocumentOptions,
  StoresClass,
  DocStore,
  RelevantChunk,
  Metadata,
};
