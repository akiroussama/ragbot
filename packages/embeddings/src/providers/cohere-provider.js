"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereEmbeddingProvider = void 0;
const cohere_ai_1 = require("cohere-ai");
const types_1 = require("../types");
class CohereEmbeddingProvider {
    name = 'cohere';
    supportedModels = [
        types_1.EmbeddingModel.COHERE_EMBED_ENGLISH,
        types_1.EmbeddingModel.COHERE_EMBED_MULTILINGUAL,
    ];
    client;
    constructor(config) {
        this.client = new cohere_ai_1.CohereClient({
            token: config.apiKey,
        });
    }
    isConfigured() {
        return !!this.client.token;
    }
    getDefaultModel() {
        return types_1.EmbeddingModel.COHERE_EMBED_MULTILINGUAL;
    }
    getDimensions(model) {
        const dimensionMap = {
            [types_1.EmbeddingModel.COHERE_EMBED_ENGLISH]: 1024,
            [types_1.EmbeddingModel.COHERE_EMBED_MULTILINGUAL]: 1024,
        };
        return dimensionMap[model] || 1024;
    }
    getMaxTokens(model) {
        return 512; // Cohere's typical context length
    }
    async embed(request) {
        const model = request.model || this.getDefaultModel();
        if (!this.supportedModels.includes(model)) {
            throw new Error(`Model ${model} not supported by Cohere provider`);
        }
        const response = await this.client.embed({
            model,
            texts: request.texts,
            inputType: 'search_document',
            embeddingTypes: ['float'],
            ...request.options,
        });
        // Estimate token usage (Cohere doesn't provide exact counts)
        const estimatedTokens = Math.ceil(request.texts.reduce((sum, text) => sum + text.length, 0) / 4);
        return {
            embeddings: response.embeddings.float || [],
            model,
            dimensions: this.getDimensions(model),
            usage: {
                promptTokens: estimatedTokens,
                totalTokens: estimatedTokens,
            },
        };
    }
}
exports.CohereEmbeddingProvider = CohereEmbeddingProvider;
//# sourceMappingURL=cohere-provider.js.map