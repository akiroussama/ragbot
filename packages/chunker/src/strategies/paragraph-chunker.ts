import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';

export class ParagraphChunker extends BaseChunkingStrategy {
  async chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]> {
    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    const chunks: Chunk[] = [];
    let currentOffset = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const startOffset = text.indexOf(paragraph, currentOffset);
      const endOffset = startOffset + paragraph.length;
      
      // If paragraph is too large, split it further
      if (this.countTokens(paragraph, options) > options.chunkSize) {
        const subChunks = this.splitLargeParagraph(paragraph, options, i, startOffset);
        chunks.push(...subChunks);
      } else {
        chunks.push(
          this.createChunk(
            paragraph,
            i,
            startOffset,
            endOffset,
            options,
            { type: 'paragraph' },
          ),
        );
      }
      
      currentOffset = endOffset;
    }

    return chunks;
  }

  private splitLargeParagraph(
    paragraph: string,
    options: Required<ChunkOptions>,
    baseIndex: number,
    baseOffset: number,
  ): Chunk[] {
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let currentOffset = baseOffset;
    let subIndex = 0;

    for (const sentence of sentences) {
      if (
        this.countTokens(currentChunk + sentence, options) > options.chunkSize &&
        currentChunk
      ) {
        chunks.push(
          this.createChunk(
            currentChunk.trim(),
            baseIndex * 1000 + subIndex++,
            currentOffset,
            currentOffset + currentChunk.length,
            options,
            { type: 'paragraph-split' },
          ),
        );
        currentOffset += currentChunk.length;
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(
        this.createChunk(
          currentChunk.trim(),
          baseIndex * 1000 + subIndex,
          currentOffset,
          currentOffset + currentChunk.length,
          options,
          { type: 'paragraph-split' },
        ),
      );
    }

    return chunks;
  }
}