import {
  Embedder,
  VectorStore,
  InitializeDocumentOptions,
  ChunkingStrategy,
  ScoredEmbedding,
  Chunk,
  Embedding,
} from "../types";
import chunkText from "./split";
import { StoresClass } from "../types";

//returns ragger object
const createRagger = (embedder: Embedder, stores: StoresClass) => {
  const vectorStore = stores.vectorStore;
  const docStore = stores.docStore;

  return {
    embedder,
    vectorStore,
    docStore,
    query: async (query: string, k: number = 3) => {
      const queryVector = await embedder.generateEmbedding(query);
      const embeddings = await vectorStore.queryEmbeddings(queryVector, k);

      // Get the chunks
      const relevantChunks = await docStore.queryFromEmbeddings(embeddings);

      return relevantChunks;
    },
    initializeDocument: async (
      text: string,
      options?: InitializeDocumentOptions
    ) => {
      // chunk the document
      const chunks: Chunk[] = chunkText(text, {
        strategy: options?.strategy || ChunkingStrategy.BY_SENTENCE,
        delimiter: options?.delimiter,
      });

      // embed the chunks
      const embeddings: Embedding[] = await embedder.embedChunks(chunks);

      // store the embeddings in a vector store
      const embeddingPromise = vectorStore.storeEmbeddings(embeddings);
      const docStorePromise = docStore.storeDocument(text);
      const docStoreChunkPromise = docStore.storeChunks(chunks);

      await Promise.all([
        embeddingPromise,
        docStorePromise,
        docStoreChunkPromise,
      ]);

      return chunks;
    },
  };
};

export default createRagger;
