"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticChunker = void 0;
const natural = __importStar(require("natural"));
const base_strategy_1 = require("./base-strategy");
class SemanticChunker extends base_strategy_1.BaseChunkingStrategy {
    async chunk(text, options) {
        // Use sentence tokenizer
        const sentenceTokenizer = new natural.SentenceTokenizer();
        const sentences = sentenceTokenizer.tokenize(text);
        const chunks = [];
        let currentChunk = [];
        let currentTokens = 0;
        let chunkIndex = 0;
        let currentOffset = 0;
        for (const sentence of sentences) {
            const sentenceTokens = this.countTokens(sentence, options);
            if (currentTokens + sentenceTokens > options.chunkSize && currentChunk.length > 0) {
                // Create chunk
                const chunkContent = currentChunk.join(' ');
                chunks.push(this.createChunk(chunkContent, chunkIndex++, currentOffset, currentOffset + chunkContent.length, options, { type: 'semantic' }));
                // Handle overlap
                if (options.chunkOverlap > 0) {
                    const overlapSentences = this.getOverlapSentences(currentChunk, options);
                    currentChunk = [...overlapSentences, sentence];
                    currentTokens = overlapSentences.reduce((sum, s) => sum + this.countTokens(s, options), sentenceTokens);
                }
                else {
                    currentOffset += chunkContent.length + 1;
                    currentChunk = [sentence];
                    currentTokens = sentenceTokens;
                }
            }
            else {
                currentChunk.push(sentence);
                currentTokens += sentenceTokens;
            }
        }
        // Add remaining chunk
        if (currentChunk.length > 0) {
            const chunkContent = currentChunk.join(' ');
            chunks.push(this.createChunk(chunkContent, chunkIndex, currentOffset, currentOffset + chunkContent.length, options, { type: 'semantic' }));
        }
        return chunks;
    }
    getOverlapSentences(sentences, options) {
        const overlapSentences = [];
        let overlapTokens = 0;
        for (let i = sentences.length - 1; i >= 0; i--) {
            const sentenceTokens = this.countTokens(sentences[i], options);
            if (overlapTokens + sentenceTokens <= options.chunkOverlap) {
                overlapSentences.unshift(sentences[i]);
                overlapTokens += sentenceTokens;
            }
            else {
                break;
            }
        }
        return overlapSentences;
    }
}
exports.SemanticChunker = SemanticChunker;
//# sourceMappingURL=semantic-chunker.js.map