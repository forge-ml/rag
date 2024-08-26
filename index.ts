const exports = {};

// We want to be able to do RAG
// -- We need to be able to handle document loading / storage
// We need to be able to chunk documents
// We need to be able to embed chunks
// We need to be able to store embeddings
// We need to be able to query embeddings
// We need to be able to get relevant chunks

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
  embedding: number[];
  score: number;
}

interface VectorStore {
  storeEmbeddings: (embeddings: Embedding[]) => void;
  retrieveEmbeddings: (chunkIds: string[]) => Embedding[];
  queryEmbeddings: (query: number[]) => Embedding[];
  deleteEmbeddings: (chunkIds: string[]) => void;
}

interface Embedder {
  generateEmbedding: (text: string) => number[];
  embedChunks: (chunks: Chunk[]) => Embedding[];
}

enum ChunkingStrategy {
  BY_PARAGRAPH = "by_paragraph",
  BY_SENTENCE = "by_sentence",
}

// STUB FNs
const chunk = (
  text: string,
  options?: { strategy: ChunkingStrategy }
): Chunk[] => {
  return [
    {
      text: text,
      metadata: {
        strategy: options?.strategy,
      },
      forgeMetadata: {
        documentId: "123",
        chunkId: "123",
      },
    },
  ];
};

const embedChunks = (chunks: Chunk[]): Embedding[] => {
  return chunks.map((chunk) => {
    return {
      chunkId: chunk.forgeMetadata.chunkId,
      embedding: [1, 2, 3],
    };
  });
};

type VectorStoreQueryOptions = {
  k: number;
};

const createRedisVectorStore = (url: string): VectorStore => {
  return {
    storeEmbeddings: (embeddings: Embedding[]) => {},
    retrieveEmbeddings: (chunkIds: string[]) => {
      return [];
    },
    queryEmbeddings: (
      vector: number[],
      options?: VectorStoreQueryOptions
    ): ScoredEmbedding[] => {
      return [];
    },
    deleteEmbeddings: (chunkIds: string[]) => {},
  };
};

const createOpenAIEmbedder = (): Embedder => {
  return {
    generateEmbedding: (text: string) => {
      return [1, 2, 3];
    },
    embedChunks: (chunks: Chunk[]): Embedding[] => {
      return chunks.map((chunk) => {
        return {
          chunkId: chunk.forgeMetadata.chunkId,
          embedding: [1, 2, 3],
        };
      });
    },
  };
};

const createRagger = (embedder: Embedder, vectorStore: VectorStore) => {
  return {
    embedder,
    vectorStore,
    query: (query: string) => {
      const queryVector = embedder.generateEmbedding(query);
      return vectorStore.queryEmbeddings(queryVector);
    },
    initializeDocument: (text: string) => {
      // chunk the document
      const chunks = chunk(text, { strategy: ChunkingStrategy.BY_PARAGRAPH });

      // embed the chunks
      const embeddings = embedder.embedChunks(chunks);

      // store the embeddings in a vector store
      vectorStore.storeEmbeddings(embeddings);
    },
  };
};

// we have a pdf, we upload the pdf
// the PDF is split into pages and uploaded as documents
// the documents are chunked

// upload the document
// extract the text
const text = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula.

Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque.
`;

// Initialize clients
const embedder = createOpenAIEmbedder();
const vectorStore = createRedisVectorStore("redis://localhost:6379");
const ragger = createRagger(embedder, vectorStore);

ragger.initializeDocument(text);

// we query the vector store
ragger.query("What is the meaning of life?");