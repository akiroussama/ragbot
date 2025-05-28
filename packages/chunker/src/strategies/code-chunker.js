"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeChunker = void 0;
const textsplitters_1 = require("@langchain/textsplitters");
const base_strategy_1 = require("./base-strategy");
class CodeChunker extends base_strategy_1.BaseChunkingStrategy {
    async chunk(text, options) {
        // Detect programming language
        const language = this.detectLanguage(text);
        const splitter = textsplitters_1.RecursiveCharacterTextSplitter.fromLanguage(language, {
            chunkSize: options.chunkSize,
            chunkOverlap: options.chunkOverlap,
        });
        const documents = await splitter.createDocuments([text]);
        return documents.map((doc, index) => {
            const startOffset = text.indexOf(doc.pageContent);
            const endOffset = startOffset + doc.pageContent.length;
            return this.createChunk(doc.pageContent, index, startOffset, endOffset, options, {
                type: 'code',
                language,
            });
        });
    }
    detectLanguage(text) {
        // Simple language detection based on patterns
        const patterns = {
            javascript: /\b(function|const|let|var|=>|class)\b/,
            typescript: /\b(interface|type|enum|namespace)\b/,
            python: /\b(def|class|import|from|if __name__)\b/,
            java: /\b(public|private|class|interface|package)\b/,
            cpp: /\b(#include|namespace|std::)\b/,
            csharp: /\b(using|namespace|class|public|private)\b/,
            go: /\b(package|func|import|type)\b/,
            rust: /\b(fn|impl|struct|trait|use)\b/,
            ruby: /\b(def|class|module|require|end)\b/,
            php: /\b(<\?php|\$|function|class)\b/,
        };
        for (const [lang, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                return lang;
            }
        }
        return 'js'; // Default to JavaScript
    }
}
exports.CodeChunker = CodeChunker;
//# sourceMappingURL=code-chunker.js.map