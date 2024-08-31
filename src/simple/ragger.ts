import {
  Embedder,
  InitializeDocumentOptions,
  ChunkingStrategy,
  Chunk,
  Embedding,
  DocumentClass,
} from "../types";
import chunkText from "../simple/split";
import { StoresClass } from "../types";

//returns ragger object
const createRagger = (embedder: Embedder, stores: StoresClass) => {
  const vectorStore = stores.vectorStore;
  const docStore = stores.docStore;

  return {
    embedder,
    vectorStore,
    docStore,
    //@QUESTION we only use the  document id does it make sense to pass in the document? If we pass in doc id the call looks like
    //const relevantChunks = await ragger.query(query, document.getForgeMetadata().documentId, 5);
    query: async (query: string, documentIds: string[], k: number = 3) => {
      const queryVector = await embedder.generateEmbedding(query);
      const embeddings = await vectorStore.queryEmbeddings({
        query: queryVector,
        k,
        documentIds,
      });

      console.log("embeddings", embeddings);

      // Get the chunks
      const relevantChunks = await docStore.mergeChunksAndEmbeddings(
        embeddings,
        documentIds
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
      const embeddings: Embedding[] = await embedder.embedChunks(
        chunks,
        document.getForgeMetadata().documentId
      );

      // store the embeddings in a vector store
      const embeddingPromise = vectorStore.storeEmbeddings(embeddings);

      //@QUESTION: in minio should documents and chunks be in the same folder or have there own folder in minio
      const docStorePromise = docStore.storeDocument(
        document,
        chunks
      );

      await Promise.all([embeddingPromise, docStorePromise]);

      return chunks;
    },
  };
};

export default createRagger;
