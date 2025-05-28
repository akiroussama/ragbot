"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecursiveChunker = void 0;
const textsplitters_1 = require("@langchain/textsplitters");
const base_strategy_1 = require("./base-strategy");
class RecursiveChunker extends base_strategy_1.BaseChunkingStrategy {
    async chunk(text, options) {
        const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
            chunkSize: options.chunkSize,
            chunkOverlap: options.chunkOverlap,
            separators: ['\n\n', '\n', '. ', ', ', ' ', ''],
        });
        const documents = await splitter.createDocuments([text]);
        return documents.map((doc, index) => {
            const startOffset = text.indexOf(doc.pageContent);
            const endOffset = startOffset + doc.pageContent.length;
            return this.createChunk(doc.pageContent, index, startOffset, endOffset, options, { type: 'recursive' });
        });
    }
}
exports.RecursiveChunker = RecursiveChunker;
//# sourceMappingURL=recursive-chunker.js.map