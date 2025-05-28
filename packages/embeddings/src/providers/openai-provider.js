"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIEmbeddingProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const types_1 = require("../types");
const tiktoken_1 = require("tiktoken");
class OpenAIEmbeddingProvider {
    name = 'openai';
    supportedModels = [
        types_1.EmbeddingModel.OPENAI_ADA_002,
        types_1.EmbeddingModel.OPENAI_3_SMALL,
        types_1.EmbeddingModel.OPENAI_3_LARGE,
    ];
    client;
    constructor(config) {
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
        });
    }
    isConfigured() {
        return !!this.client.apiKey;
    }
    getDefaultModel() {
        return types_1.EmbeddingModel.OPENAI_3_SMALL;
    }
    getDimensions(model) {
        const dimensionMap = {
            [types_1.EmbeddingModel.OPENAI_ADA_002]: 1536,
            [types_1.EmbeddingModel.OPENAI_3_SMALL]: 1536,
            [types_1.EmbeddingModel.OPENAI_3_LARGE]: 3072,
        };
        return dimensionMap[model] || 1536;
    }
    getMaxTokens(model) {
        const tokenLimits = {
            [types_1.EmbeddingModel.OPENAI_ADA_002]: 8191,
            [types_1.EmbeddingModel.OPENAI_3_SMALL]: 8191,
            [types_1.EmbeddingModel.OPENAI_3_LARGE]: 8191,
        };
        return tokenLimits[model] || 8191;
    }
    async embed(request) {
        const model = request.model || this.getDefaultModel();
        if (!this.supportedModels.includes(model)) {
            throw new Error(`Model ${model} not supported by OpenAI provider`);
        }
        // Count tokens for usage tracking
        let totalTokens = 0;
        try {
            const encoding = (0, tiktoken_1.encoding_for_model)(model);
            totalTokens = request.texts.reduce((sum, text) => {
                const tokens = encoding.encode(text);
                return sum + tokens.length;
            }, 0);
            encoding.free();
        }
        catch {
            // Fallback to character estimation
            totalTokens = Math.ceil(request.texts.reduce((sum, text) => sum + text.length, 0) / 4);
        }
        const response = await this.client.embeddings.create({
            model,
            input: request.texts,
            encoding_format: 'float',
            ...request.options,
        });
        return {
            embeddings: response.data.map(item => item.embedding),
            model: response.model,
            dimensions: this.getDimensions(model),
            usage: {
                promptTokens: response.usage.prompt_tokens,
                totalTokens: response.usage.total_tokens,
            },
        };
    }
}
exports.OpenAIEmbeddingProvider = OpenAIEmbeddingProvider;
//# sourceMappingURL=openai-provider.js.map