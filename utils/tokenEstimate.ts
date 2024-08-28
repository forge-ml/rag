import { Chunk } from "../types";

export const estimateTokens = (chunks: Chunk[]) => {
  return chunks.reduce((total, chunk) => {
    // Estimate tokens using a simple heuristic (4 characters per token)
    const estimatedTokens = Math.ceil(chunk.text.length / 4);
    return total + estimatedTokens;
  }, 0);
};

export const estimateTokensByLength = (length: number) => {
  return Math.ceil(length / 4);
};