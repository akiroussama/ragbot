import * as natural from 'natural';
import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';

export class SentenceChunker extends BaseChunkingStrategy {
  async chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]> {
    const sentenceTokenizer = new natural.SentenceTokenizer();
    const sentences = sentenceTokenizer.tokenize(text);
    
    const chunks: Chunk[] = [];
    let currentOffset = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const startOffset = text.indexOf(sentence, currentOffset);
      const endOffset = startOffset + sentence.length;
      
      chunks.push(
        this.createChunk(
          sentence,
          i,
          startOffset,
          endOffset,
          options,
          { type: 'sentence' },
        ),
      );
      
      currentOffset = endOffset;
    }

    return chunks;
  }
}