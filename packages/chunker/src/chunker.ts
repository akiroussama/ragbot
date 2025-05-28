import { ChunkOptions, ChunkingResult, ChunkingStrategy } from './types';
import {
  RecursiveChunker,
  SemanticChunker,
  SentenceChunker,
  ParagraphChunker,
  MarkdownChunker,
  CodeChunker,
  FixedSizeChunker,
} from './strategies';

export class IntelligentChunker {
  private strategies = new Map([
    [ChunkingStrategy.RECURSIVE, new RecursiveChunker()],
    [ChunkingStrategy.SEMANTIC, new SemanticChunker()],
    [ChunkingStrategy.SENTENCE, new SentenceChunker()],
    [ChunkingStrategy.PARAGRAPH, new ParagraphChunker()],
    [ChunkingStrategy.MARKDOWN, new MarkdownChunker()],
    [ChunkingStrategy.CODE, new CodeChunker()],
    [ChunkingStrategy.FIXED_SIZE, new FixedSizeChunker()],
  ]);

  async chunk(text: string, options: ChunkOptions = {}): Promise<ChunkingResult> {
    const startTime = Date.now();

    const finalOptions: Required<ChunkOptions> = {
      chunkSize: options.chunkSize || 1000,
      chunkOverlap: options.chunkOverlap || 200,
      minChunkSize: options.minChunkSize || 100,
      maxChunkSize: options.maxChunkSize || 2000,
      strategy: options.strategy || this.detectBestStrategy(text),
      preserveStructure: options.preserveStructure ?? true,
      language: options.language || 'en',
      tokenizer: options.tokenizer || 'character',
      model: options.model || 'gpt-3.5-turbo',
    };

    const strategy = this.strategies.get(finalOptions.strategy);
    if (!strategy) {
      throw new Error(`Unknown chunking strategy: ${finalOptions.strategy}`);
    }

    const chunks = await strategy.chunk(text, finalOptions);

    const processingTime = Date.now() - startTime;
    const totalTokens = chunks.reduce((sum, chunk) => sum + (chunk.metadata.tokens || 0), 0);

    return {
      chunks,
      totalChunks: chunks.length,
      totalTokens,
      metadata: {
        strategy: finalOptions.strategy,
        chunkSize: finalOptions.chunkSize,
        chunkOverlap: finalOptions.chunkOverlap,
        processingTime,
      },
    };
  }

  private detectBestStrategy(text: string): ChunkingStrategy {
    // Simple heuristics to detect the best strategy
    const codePatterns = /```[\s\S]*?```|^\s*(function|class|const|let|var|import|export)/m;
    const markdownPatterns = /^#{1,6}\s|^\*\s|^\d+\.\s|^\[.*\]\(.*\)/m;
    const htmlPatterns = /<[^>]+>/;

    if (codePatterns.test(text)) {
      return ChunkingStrategy.CODE;
    }

    if (markdownPatterns.test(text)) {
      return ChunkingStrategy.MARKDOWN;
    }

    if (htmlPatterns.test(text)) {
      return ChunkingStrategy.RECURSIVE;
    }

    // Check average sentence length
    const sentences = text.match(/[.!?]+/g) || [];
    const avgSentenceLength = text.length / (sentences.length || 1);

    if (avgSentenceLength < 100) {
      return ChunkingStrategy.SENTENCE;
    }

    // Default to recursive for general text
    return ChunkingStrategy.RECURSIVE;
  }

  getSupportedStrategies(): ChunkingStrategy[] {
    return Array.from(this.strategies.keys());
  }
}