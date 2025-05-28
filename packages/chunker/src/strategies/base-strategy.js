"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseChunkingStrategy = void 0;
const tiktoken_1 = require("tiktoken");
class BaseChunkingStrategy {
    countTokens(text, options) {
        if (options.tokenizer === 'tiktoken') {
            try {
                const encoding = (0, tiktoken_1.encoding_for_model)(options.model);
                const tokens = encoding.encode(text);
                encoding.free();
                return tokens.length;
            }
            catch {
                // Fallback to character count
                return Math.ceil(text.length / 4);
            }
        }
        // Character-based token estimation
        return Math.ceil(text.length / 4);
    }
    createChunk(content, index, startOffset, endOffset, options, additionalMetadata) {
        return {
            content,
            metadata: {
                index,
                startOffset,
                endOffset,
                tokens: this.countTokens(content, options),
                ...additionalMetadata,
            },
        };
    }
    splitIntoChunks(text, separator, options) {
        const chunks = [];
        const parts = text.split(separator);
        let currentChunk = '';
        let currentOffset = 0;
        let chunkIndex = 0;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i] + (i < parts.length - 1 ? separator : '');
            const partTokens = this.countTokens(part, options);
            const currentTokens = this.countTokens(currentChunk, options);
            if (currentTokens + partTokens > options.chunkSize && currentChunk) {
                // Save current chunk
                chunks.push(this.createChunk(currentChunk.trim(), chunkIndex++, currentOffset, currentOffset + currentChunk.length, options));
                // Start new chunk with overlap
                if (options.chunkOverlap > 0) {
                    const overlapText = this.getOverlapText(currentChunk, options);
                    currentChunk = overlapText + part;
                    currentOffset += currentChunk.length - overlapText.length - part.length;
                }
                else {
                    currentChunk = part;
                    currentOffset += currentChunk.length;
                }
            }
            else {
                currentChunk += part;
            }
        }
        // Add remaining chunk
        if (currentChunk.trim()) {
            chunks.push(this.createChunk(currentChunk.trim(), chunkIndex, currentOffset, currentOffset + currentChunk.length, options));
        }
        return chunks;
    }
    getOverlapText(text, options) {
        const tokens = this.countTokens(text, options);
        if (tokens <= options.chunkOverlap) {
            return text;
        }
        // Approximate overlap by character ratio
        const ratio = options.chunkOverlap / tokens;
        const overlapLength = Math.floor(text.length * ratio);
        return text.slice(-overlapLength);
    }
}
exports.BaseChunkingStrategy = BaseChunkingStrategy;
//# sourceMappingURL=base-strategy.js.map