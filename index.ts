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
Artificial Intelligence: An Overview

Artificial Intelligence (AI) is a rapidly evolving field of computer science focused on creating intelligent machines that can perform tasks typically requiring human intelligence. These tasks include visual perception, speech recognition, decision-making, and language translation.

Machine Learning, a subset of AI, involves algorithms that enable computers to learn from and make predictions or decisions based on data. Deep Learning, a more specialized form of Machine Learning, uses neural networks with many layers to analyze various factors of data.

AI applications are widespread in modern society. In healthcare, AI assists in diagnosing diseases and developing treatment plans. In finance, it's used for fraud detection and algorithmic trading. Self-driving cars rely on AI for navigation and obstacle avoidance. Virtual assistants like Siri and Alexa use AI to understand and respond to voice commands.

Ethical considerations in AI development include issues of privacy, bias in decision-making algorithms, and the potential impact on employment. As AI systems become more advanced, ensuring they align with human values and societal norms becomes increasingly important.

The future of AI holds immense potential. Researchers are working on artificial general intelligence (AGI), which aims to create AI systems with human-like cognitive abilities. Quantum computing may also revolutionize AI, enabling much faster processing of complex algorithms.
`;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

// Initialize clients
const embedder = new OpenAIEmbedder({
  type: "openai",
  apiKey: process.env.OPENAI_API_KEY,
});
// const vectorStore = createRedisVectorStore("redis://localhost:6379");
// const ragger = createRagger(embedder, vectorStore);

// ragger.initializeDocument(text);

// // we query the vector store
// ragger.query("What is the meaning of life?");

const chunks = chunkText(text, {
  strategy: ChunkingStrategy.BY_PARAGRAPH,
});

const embeddings = await embedder.embedChunks(chunks);
// const embeddings = [
//   {
//     chunkId: "1",
//     embedding: [1, 2, 3],
//   },
//   {
//     chunkId: "2",
//     embedding: [4, 5, 6],
//   },
//   {
//     chunkId: "3",
//     embedding: [7, 8, 9],
//   },
// ];

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}

const vectorStore = new RedisVectorStore(process.env.REDIS_URL);

vectorStore.createIndex();

const addEmbeddingPromises = embeddings.map((embedding) => {
  return vectorStore.addEmbedding({
    ...embedding,
  });
});

await Promise.all(addEmbeddingPromises);

// const dumpEmbeddings = async (vectorStore: RedisVectorStore) => {
//   const dump = await vectorStore.client.json.get("chunks:1");
//   console.log("dump", dump);
// };

// // Dump the entire Redis database
// await dumpEmbeddings(vectorStore);

const query = "How does ai affect healthcare?";

const queryVector = await embedder.generateEmbedding(query);

const results = await vectorStore.knnSearchEmbeddings({
  inputVector: queryVector,
  k: 2,
});

console.log(JSON.stringify(results, null, 2));

const relevantChunks = results.documents;

//get the text of the chunks based on id

console.log(relevantChunks);

vectorStore.client.disconnect();
