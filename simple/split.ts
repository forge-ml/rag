import { Chunk, ChunkingStrategy } from '../types';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * TODO:
 * - [ ] Fix chunking strategies
 * - [ ] Generate unique document IDs and chunk IDs
 * - [ ] Actually add metadata to chunks
 */

/**
 * Splits text into chunks suitable for RAG.
 * @param text The input text to be chunked.
 * @param options Chunking options.
 * @returns An array of Chunk objects.
 */
const chunkText = (
  text: string,
  options: {
    strategy?: ChunkingStrategy;
    chunkSize?: number;
    chunkOverlap?: number;
  } = {}
): Chunk[] => {
  const {
    strategy = ChunkingStrategy.BY_PARAGRAPH,
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = options;

  const chunks: Chunk[] = [];
  let documentId = Date.now().toString(); // Simple unique ID generation

  const splitText = strategy === ChunkingStrategy.BY_PARAGRAPH
    ? text.split(/\n\s*\n/)
    : text.split(/[.!?]+\s+/);

  let currentChunk = '';
  let chunkId = 0;

  for (const segment of splitText) {
    // TODO: chunk size should be "maximum" size, not "once exceeded" size
    if (currentChunk.length + segment.length > chunkSize) {
      if (currentChunk) {
        chunks.push(createChunk(currentChunk, documentId, chunkId++));
        currentChunk = currentChunk.slice(-chunkOverlap);
      }
    }
    currentChunk += (currentChunk ? ' ' : '') + segment;
  }

  if (currentChunk) {
    chunks.push(createChunk(currentChunk, documentId, chunkId));
  }

  return chunks;
};

const createChunk = (text: string, documentId: string, chunkId: number): Chunk => ({
  id: `${documentId}-${chunkId}`,
  forgeMetadata: {
    documentId,
    chunkId: `${documentId}-${chunkId}`,
  },
  metadata: {},
  text,
});

export default chunkText;



