import Document from "./documents/documents";
import { VECTOR_MODEL_DIM } from "./stores/vectorStore/types";

interface Metadata {
  documentId: string;
  page?: number; // the page number of the document
}

interface ChunkMetadata {
  documentId: string;
  chunkId: string;
}

interface DocumentClass {
  getUserMetadata: () => Record<string, any>;
  getForgeMetadata: () => Metadata;
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
  documentId: string;
}

interface ScoredEmbedding {
  chunkId: string;
  documentId: string;
  score: number;
}

//@TODO find a better name
type RelevantChunk = {
  documentId: string;
  chunkId: string;
  text: string;
  score: number;
};

type CreateIndexOpts = {
  dim: VECTOR_MODEL_DIM;
}

interface VectorStore {
  storeEmbeddings: (embeddings: Embedding[]) => Promise<void>;
  // retrieveEmbeddings: (chunkIds: string[]) => Promise<Embedding[]>;
  queryEmbeddings: (params: {
    query: number[];
    k: number;
    documentIds?: string[];
  }) => Promise<ScoredEmbedding[]>;
  createIndex: (opts?: CreateIndexOpts) => Promise<void>;
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
  storeDocument: (document: DocumentClass, chunks: Chunk[]) => Promise<void>;

  //@TODO: broken - returns json object instead fo Document Class
  retrieveDocument: (documentId: string) => Promise<DocumentClass>;

  //@TODO: broken - find a way to update the document content without updating the id
  updateDocument: (document: Document, documentId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;

  //@TODO: broken - returns json object instead of Chunk[]
  retrieveChunks: (documentIds: string[]) => Promise<Chunk[]>;

  mergeChunksAndEmbeddings: (
    embeddings: ScoredEmbedding[],
    documentIds: string[]
  ) => Promise<RelevantChunk[]>; // given a query embedding, return the chunks that are most relevant
};

type StoresClass = {
  vectorStore: VectorStore;
  docStore: DocStore;
};

interface Embedder {
  generateEmbedding: (text: string) => Promise<number[]>;
  embedChunks: (chunks: Chunk[], documentId: string) => Promise<Embedding[]>;
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
  BY_WORD_COUNT = "by_word_count",
  BY_DOCUMENT = "by_document",
}

type StrategiesWithOptions =
  | {
      strategy: ChunkingStrategy.BY_CUSTOM_DELIMITER;
      delimiter: string;
      wordCount?: undefined;
    }
  | {
      strategy: ChunkingStrategy.BY_WORD_COUNT;
      wordCount: number;
      delimiter?: undefined;
    };

type InitializeDocumentOptions =
  | {
      strategy: Exclude<ChunkingStrategy, StrategiesWithOptions["strategy"]>;
      delimiter?: undefined;
      wordCount?: undefined;
    }
  | StrategiesWithOptions;

export { ChunkingStrategy };

export type {
  Chunk,
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
