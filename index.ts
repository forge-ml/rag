import OpenAI from "./node_modules/openai/index";
import RedisVectorStore from "./redis/client";
import OpenAIEmbedder from "./simple/embedder";
import chunkText from "./simple/split";
import {
  ChunkingStrategy,
  Embedding,
  ScoredEmbedding,
  VectorStore,
  Embedder,
} from "./types";

// We want to be able to do RAG
// -- We need to be able to handle document loading / storage
// We need to be able to chunk documents
// We need to be able to embed chunks
// We need to be able to store embeddings
// We need to be able to query embeddings
// We need to be able to get relevant chunks

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

const createRagger = (embedder: Embedder, vectorStore: VectorStore) => {
  return {
    embedder,
    vectorStore,
    query: async (query: string) => {
      const queryVector = await embedder.generateEmbedding(query);
      return vectorStore.queryEmbeddings(queryVector);
    },
    initializeDocument: async (text: string) => {
      // chunk the document
      const chunks = chunkText(text, {
        strategy: ChunkingStrategy.BY_PARAGRAPH,
      });

      // embed the chunks
      const embeddings = await embedder.embedChunks(chunks);

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
const embedder = new OpenAIEmbedder({
  type: "openai",
  apiKey: "sk-not-today"
});
// const vectorStore = createRedisVectorStore("redis://localhost:6379");
// const ragger = createRagger(embedder, vectorStore);

// ragger.initializeDocument(text);

// // we query the vector store
// ragger.query("What is the meaning of life?");

const chunks = chunkText(text, {
  strategy: ChunkingStrategy.BY_PARAGRAPH,
});

// const embeddings = await embedder.embedChunks(chunks);
const embeddings = [
  {
    chunkId: "1",
    embedding: [1, 2, 3],
  },
  {
    chunkId: "2",
    embedding: [4, 5, 6],
  },
  {
    chunkId: "3",
    embedding: [7, 8, 9],
  },
];

const vectorStore = new RedisVectorStore("redis://localhost:6379");

vectorStore.createIndex();

const addEmbeddingPromises = embeddings.map((embedding) => {
  return vectorStore.addEmbedding({
    ...embedding,
  });
});

await Promise.all(addEmbeddingPromises);

const dumpEmbeddings = async (vectorStore: RedisVectorStore) => {
  const dump = await vectorStore.client.json.get("chunks:1");
  console.log("dump", dump);
};

// Dump the entire Redis database
await dumpEmbeddings(vectorStore);

const results = await vectorStore.knnSearchEmbeddings({
  inputVector: [1, 2, 3],
  k: 3,
});

console.log(JSON.stringify(results, null, 2));

vectorStore.client.disconnect();

