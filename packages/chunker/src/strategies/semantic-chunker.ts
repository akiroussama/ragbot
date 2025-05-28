import * as natural from 'natural';
import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';

export class SemanticChunker extends BaseChunkingStrategy {
  async chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]> {
    // Use sentence tokenizer
    const sentenceTokenizer = new natural.SentenceTokenizer();
    const sentences = sentenceTokenizer.tokenize(text);
    
    const chunks: Chunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let currentOffset = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence, options);
      
      if (currentTokens + sentenceTokens > options.chunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunkContent = currentChunk.join(' ');
        chunks.push(
          this.createChunk(
            chunkContent,
            chunkIndex++,
            currentOffset,
            currentOffset + chunkContent.length,
            options,
            { type: 'semantic' },
          ),
        );
        
        // Handle overlap
        if (options.chunkOverlap > 0) {
          const overlapSentences = this.getOverlapSentences(currentChunk, options);
          currentChunk = [...overlapSentences, sentence];
          currentTokens = overlapSentences.reduce(
            (sum, s) => sum + this.countTokens(s, options),
            sentenceTokens,
          );
        } else {
          currentOffset += chunkContent.length + 1;
          currentChunk = [sentence];
          currentTokens = sentenceTokens;
        }
      } else {
        currentChunk.push(sentence);
        currentTokens += sentenceTokens;
      }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      chunks.push(
        this.createChunk(
          chunkContent,
          chunkIndex,
          currentOffset,
          currentOffset + chunkContent.length,
          options,
          { type: 'semantic' },
        ),
      );
    }

    return chunks;
  }

  private getOverlapSentences(sentences: string[], options: Required<ChunkOptions>): string[] {
    const overlapSentences: string[] = [];
    let overlapTokens = 0;

    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentenceTokens = this.countTokens(sentences[i], options);
      if (overlapTokens + sentenceTokens <= options.chunkOverlap) {
        overlapSentences.unshift(sentences[i]);
        overlapTokens += sentenceTokens;
      } else {
        break;
      }
    }

    return overlapSentences;
  }
}