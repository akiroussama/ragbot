import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';

export class FixedSizeChunker extends BaseChunkingStrategy {
  async chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]> {
    const chunks: Chunk[] = [];
    let currentOffset = 0;
    let chunkIndex = 0;

    while (currentOffset < text.length) {
      // Calculate chunk size in characters based on token estimation
      const chunkSizeChars = options.chunkSize * 4; // Approximate 4 chars per token
      let endOffset = Math.min(currentOffset + chunkSizeChars, text.length);

      // Try to break at word boundary
      if (endOffset < text.length) {
        const lastSpace = text.lastIndexOf(' ', endOffset);
        if (lastSpace > currentOffset + chunkSizeChars * 0.8) {
          endOffset = lastSpace;
        }
      }

      const chunkContent = text.slice(currentOffset, endOffset).trim();

      if (chunkContent) {
        chunks.push(
          this.createChunk(
            chunkContent,
            chunkIndex++,
            currentOffset,
            endOffset,
            options,
            { type: 'fixed-size' },
          ),
        );
      }

      // Handle overlap
      if (options.chunkOverlap > 0 && endOffset < text.length) {
        const overlapChars = options.chunkOverlap * 4;
        currentOffset = endOffset - overlapChars;
      } else {
        currentOffset = endOffset;
      }
    }

    return chunks;
  }
}