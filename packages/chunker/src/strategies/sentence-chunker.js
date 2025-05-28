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
exports.SentenceChunker = void 0;
const natural = __importStar(require("natural"));
const base_strategy_1 = require("./base-strategy");
class SentenceChunker extends base_strategy_1.BaseChunkingStrategy {
    async chunk(text, options) {
        const sentenceTokenizer = new natural.SentenceTokenizer();
        const sentences = sentenceTokenizer.tokenize(text);
        const chunks = [];
        let currentOffset = 0;
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const startOffset = text.indexOf(sentence, currentOffset);
            const endOffset = startOffset + sentence.length;
            chunks.push(this.createChunk(sentence, i, startOffset, endOffset, options, { type: 'sentence' }));
            currentOffset = endOffset;
        }
        return chunks;
    }
}
exports.SentenceChunker = SentenceChunker;
//# sourceMappingURL=sentence-chunker.js.map