import {
  Embedder,
  VectorStore,
  InitializeDocumentOptions,
  ChunkingStrategy,
  ScoredEmbedding,
  Chunk,
  Embedding,
  DocumentClass,
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
    query: async (query: string, document: DocumentClass, k: number = 3) => {
      const queryVector = await embedder.generateEmbedding(query);
      const embeddings = await vectorStore.queryEmbeddings(queryVector, k);

      // Get the chunks
      const relevantChunks = await docStore.queryFromEmbeddings(
        embeddings,
        document
      );

      return relevantChunks;
    },
    initializeDocument: async (
      document: DocumentClass,
      options?: InitializeDocumentOptions
    ) => {
      // chunk the document
      const chunks: Chunk[] = chunkText(document, {
        strategy: options?.strategy || ChunkingStrategy.BY_SENTENCE,
        delimiter: options?.delimiter,
      });

      // embed the chunks
      const embeddings: Embedding[] = await embedder.embedChunks(chunks);

      // store the embeddings in a vector store
      const embeddingPromise = vectorStore.storeEmbeddings(embeddings);

      //@QUESTION: in minio should documents and chunks be in the same folder or have there own folder
      const docStorePromise = docStore.storeDocument(document);
      const docStoreChunkPromise = docStore.storeChunks(chunks, document);

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
