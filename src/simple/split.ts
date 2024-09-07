import { Chunk, ChunkingStrategy, DocumentClass } from "../types";

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
  document: DocumentClass,
  options: {
    strategy?: ChunkingStrategy;
    delimiter?: string;
    chunkSize?: number;
    chunkOverlap?: number;
    wordCount?: number;
  } = {}
): Chunk[] => {
  const {
    strategy = ChunkingStrategy.BY_PARAGRAPH,
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    wordCount = 500,
  } = options;

  const text = document.getText();
  const documentId = document.getForgeMetadata().documentId;
  const chunks: Chunk[] = [];

  const splitText = (() => {
    switch (strategy) {
      case ChunkingStrategy.BY_PARAGRAPH:
        return text.split(/\n\s*\n/).filter(Boolean);
      case ChunkingStrategy.BY_SENTENCE:
        return text.split(/(?<=[.!?])\s+/).filter(Boolean);
      case ChunkingStrategy.BY_ITEM_IN_LIST:
        return text.split(/\n\s*[-•*]\s*/).filter(Boolean);
      case ChunkingStrategy.BY_CUSTOM_DELIMITER:
        return text.split(options?.delimiter || ",").map(s => s.trim()).filter(Boolean);
      case ChunkingStrategy.BY_WORD_COUNT:
        return text.split(/\s+/).reduce((acc, word, index) => {
          if (index % wordCount === 0) acc.push([word]);
          else acc[acc.length - 1].push(word);
          return acc;
        }, [] as string[][]).map(words => words.join(' '));
      case ChunkingStrategy.BY_DOCUMENT:
        return [text];
      default:
        return text.split(/\n\s*\n/).filter(Boolean);
    }
  })();
  // Initialize a counter for chunk IDs
  let chunkId = 0;

  // Iterate through each split text segment
  for (let i = 0; i < splitText.length; i++) {
    // Get the current text segment
    let currentChunk = splitText[i];

    // Process the current chunk, potentially breaking it into smaller pieces
    while (currentChunk.length > 0) {
      // Extract a portion of the current chunk up to the specified chunk size
      const chunkToAdd = currentChunk.slice(0, chunkSize);
      // Create a new chunk and add it to the chunks array
      chunks.push(createChunk(chunkToAdd, documentId, chunkId++));
      
      // If the current chunk is longer than the chunk size, prepare for the next iteration
      if (currentChunk.length > chunkSize) {
        // Slide the window, considering the overlap
        currentChunk = currentChunk.slice(chunkSize - chunkOverlap);
      } else {
        // If the remaining text is shorter than chunk size, exit the loop
        break;
      }
    }

    const separator = strategy === ChunkingStrategy.BY_SENTENCE ? ' ' : '\n\n';

    // Check if we can combine the current chunk with the next one
    // (except for word count strategy, which has predefined chunk sizes)
    if (i < splitText.length - 1 && strategy !== ChunkingStrategy.BY_WORD_COUNT) {
      const lastChunk = chunks[chunks.length - 1];
      const nextChunk = splitText[i + 1];
      // If combining doesn't exceed the chunk size, merge them
      if (lastChunk.text.length + nextChunk.length <= chunkSize) {
        // Add appropriate separator based on the chunking strategy
        lastChunk.text += separator + nextChunk;
        // Skip the next iteration since we've already processed that chunk
        i++;
      }
    }
  }

  return chunks;
};

const createChunk = (
  text: string,
  documentId: string,
  chunkId: number
): Chunk => ({
  id: `${documentId}-${chunkId}`,
  forgeMetadata: {
    documentId,
    chunkId: `${documentId}-${chunkId}`,
  },
  metadata: {}, // Add this line
  text,
});

export default chunkText;
