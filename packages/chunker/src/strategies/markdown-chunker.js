"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownChunker = void 0;
const textsplitters_1 = require("@langchain/textsplitters");
const base_strategy_1 = require("./base-strategy");
class MarkdownChunker extends base_strategy_1.BaseChunkingStrategy {
    async chunk(text, options) {
        const splitter = new textsplitters_1.MarkdownTextSplitter({
            chunkSize: options.chunkSize,
            chunkOverlap: options.chunkOverlap,
        });
        const documents = await splitter.createDocuments([text]);
        const chunks = [];
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            const content = doc.pageContent;
            const startOffset = text.indexOf(content);
            const endOffset = startOffset + content.length;
            // Extract headings from the chunk
            const headings = this.extractHeadings(content);
            chunks.push(this.createChunk(content, i, startOffset, endOffset, options, {
                type: 'markdown',
                headings,
            }));
        }
        return chunks;
    }
    extractHeadings(content) {
        const headingRegex = /^#{1,6}\s+(.+)$/gm;
        const headings = [];
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
            headings.push(match[1].trim());
        }
        return headings;
    }
}
exports.MarkdownChunker = MarkdownChunker;
//# sourceMappingURL=markdown-chunker.js.map