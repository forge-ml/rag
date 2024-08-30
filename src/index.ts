import chunkText from "./simple/split";
import { cleanText } from "./utils/preprocess";
import Document from "./documents/documents";
// Embedders
import OpenAIEmbedder from "./embedders/openaiEmbedder";
import NomicEmbedder from "./embedders/nomicEmbedder";

// Stores
import Stores from "./stores/store";
import RedisVectorStore from "./stores/vectorStore/redis/index";
import MinioDocStore from "./stores/docStore/minio/index";

// main
import createRagger from "./simple/ragger";

// Re-export types
export * from "../src/types";

// Export main functions and classes
export { chunkText, cleanText };
export { Document };

// Embedders
export { OpenAIEmbedder, NomicEmbedder };

// Stores
export { Stores };
export { RedisVectorStore, MinioDocStore };

export default createRagger;
