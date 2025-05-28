"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligentChunker = void 0;
const types_1 = require("./types");
const strategies_1 = require("./strategies");
class IntelligentChunker {
    strategies = new Map([
        [types_1.ChunkingStrategy.RECURSIVE, new strategies_1.RecursiveChunker()],
        [types_1.ChunkingStrategy.SEMANTIC, new strategies_1.SemanticChunker()],
        [types_1.ChunkingStrategy.SENTENCE, new strategies_1.SentenceChunker()],
        [types_1.ChunkingStrategy.PARAGRAPH, new strategies_1.ParagraphChunker()],
        [types_1.ChunkingStrategy.MARKDOWN, new strategies_1.MarkdownChunker()],
        [types_1.ChunkingStrategy.CODE, new strategies_1.CodeChunker()],
        [types_1.ChunkingStrategy.FIXED_SIZE, new strategies_1.FixedSizeChunker()],
    ]);
    async chunk(text, options = {}) {
        const startTime = Date.now();
        const finalOptions = {
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
    detectBestStrategy(text) {
        // Simple heuristics to detect the best strategy
        const codePatterns = /```[\s\S]*?```|^\s*(function|class|const|let|var|import|export)/m;
        const markdownPatterns = /^#{1,6}\s|^\*\s|^\d+\.\s|^\[.*\]\(.*\)/m;
        const htmlPatterns = /<[^>]+>/;
        if (codePatterns.test(text)) {
            return types_1.ChunkingStrategy.CODE;
        }
        if (markdownPatterns.test(text)) {
            return types_1.ChunkingStrategy.MARKDOWN;
        }
        if (htmlPatterns.test(text)) {
            return types_1.ChunkingStrategy.RECURSIVE;
        }
        // Check average sentence length
        const sentences = text.match(/[.!?]+/g) || [];
        const avgSentenceLength = text.length / (sentences.length || 1);
        if (avgSentenceLength < 100) {
            return types_1.ChunkingStrategy.SENTENCE;
        }
        // Default to recursive for general text
        return types_1.ChunkingStrategy.RECURSIVE;
    }
    getSupportedStrategies() {
        return Array.from(this.strategies.keys());
    }
}
exports.IntelligentChunker = IntelligentChunker;
//# sourceMappingURL=chunker.js.map