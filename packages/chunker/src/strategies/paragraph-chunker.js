"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParagraphChunker = void 0;
const base_strategy_1 = require("./base-strategy");
class ParagraphChunker extends base_strategy_1.BaseChunkingStrategy {
    async chunk(text, options) {
        // Split by double newlines (paragraphs)
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        const chunks = [];
        let currentOffset = 0;
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].trim();
            const startOffset = text.indexOf(paragraph, currentOffset);
            const endOffset = startOffset + paragraph.length;
            // If paragraph is too large, split it further
            if (this.countTokens(paragraph, options) > options.chunkSize) {
                const subChunks = this.splitLargeParagraph(paragraph, options, i, startOffset);
                chunks.push(...subChunks);
            }
            else {
                chunks.push(this.createChunk(paragraph, i, startOffset, endOffset, options, { type: 'paragraph' }));
            }
            currentOffset = endOffset;
        }
        return chunks;
    }
    splitLargeParagraph(paragraph, options, baseIndex, baseOffset) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        const chunks = [];
        let currentChunk = '';
        let currentOffset = baseOffset;
        let subIndex = 0;
        for (const sentence of sentences) {
            if (this.countTokens(currentChunk + sentence, options) > options.chunkSize &&
                currentChunk) {
                chunks.push(this.createChunk(currentChunk.trim(), baseIndex * 1000 + subIndex++, currentOffset, currentOffset + currentChunk.length, options, { type: 'paragraph-split' }));
                currentOffset += currentChunk.length;
                currentChunk = sentence;
            }
            else {
                currentChunk += sentence;
            }
        }
        if (currentChunk) {
            chunks.push(this.createChunk(currentChunk.trim(), baseIndex * 1000 + subIndex, currentOffset, currentOffset + currentChunk.length, options, { type: 'paragraph-split' }));
        }
        return chunks;
    }
}
exports.ParagraphChunker = ParagraphChunker;
//# sourceMappingURL=paragraph-chunker.js.map