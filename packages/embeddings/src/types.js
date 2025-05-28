"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingModel = void 0;
var EmbeddingModel;
(function (EmbeddingModel) {
    // OpenAI
    EmbeddingModel["OPENAI_ADA_002"] = "text-embedding-ada-002";
    EmbeddingModel["OPENAI_3_SMALL"] = "text-embedding-3-small";
    EmbeddingModel["OPENAI_3_LARGE"] = "text-embedding-3-large";
    // Anthropic (hypothetical)
    EmbeddingModel["ANTHROPIC_EMBED_1"] = "anthropic-embed-1";
    // Cohere
    EmbeddingModel["COHERE_EMBED_ENGLISH"] = "embed-english-v3.0";
    EmbeddingModel["COHERE_EMBED_MULTILINGUAL"] = "embed-multilingual-v3.0";
    // HuggingFace
    EmbeddingModel["SENTENCE_TRANSFORMERS_ALL_MINILM"] = "sentence-transformers/all-MiniLM-L6-v2";
    EmbeddingModel["SENTENCE_TRANSFORMERS_ALL_MPNET"] = "sentence-transformers/all-mpnet-base-v2";
    // Local models
    EmbeddingModel["LOCAL_SENTENCET5"] = "local/sentence-t5-base";
})(EmbeddingModel || (exports.EmbeddingModel = EmbeddingModel = {}));
//# sourceMappingURL=types.js.map