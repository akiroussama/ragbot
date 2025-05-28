"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuggingFaceEmbeddingProvider = void 0;
const inference_1 = require("@huggingface/inference");
const types_1 = require("../types");
class HuggingFaceEmbeddingProvider {
    name = 'huggingface';
    supportedModels = [
        types_1.EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MINILM,
        types_1.EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MPNET,
    ];
    client;
    endpointUrl;
    constructor(config) {
        this.client = new inference_1.HfInference(config.apiKey);
        this.endpointUrl = config.endpointUrl;
    }
    isConfigured() {
        return !!this.client.accessToken;
    }
    getDefaultModel() {
        return types_1.EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MINILM;
    }
    getDimensions(model) {
        const dimensionMap = {
            [types_1.EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MINILM]: 384,
            [types_1.EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MPNET]: 768,
        };
        return dimensionMap[model] || 384;
    }
    getMaxTokens(model) {
        return 512; // Typical for sentence transformers
    }
    async embed(request) {
        const model = request.model || this.getDefaultModel();
        if (!this.supportedModels.includes(model)) {
            throw new Error(`Model ${model} not supported by HuggingFace provider`);
        }
        const embeddings = [];
        // Process texts individually as HF Inference API handles single texts
        for (const text of request.texts) {
            const response = await this.client.featureExtraction({
                model,
                inputs: text,
                options: {
                    use_cache: false,
                    wait_for_model: true,
                    ...request.options,
                },
            });
            // Handle different response formats
            let embedding;
            if (Array.isArray(response) && Array.isArray(response[0])) {
                // Pooled embeddings (take mean)
                embedding = response.reduce((acc, vec) => {
                    return acc.map((val, idx) => val + vec[idx]);
                }).map(val => val / response.length);
            }
            else {
                embedding = response;
            }
            embeddings.push(embedding);
        }
        // Estimate token usage
        const estimatedTokens = Math.ceil(request.texts.reduce((sum, text) => sum + text.length, 0) / 4);
        return {
            embeddings,
            model,
            dimensions: this.getDimensions(model),
            usage: {
                promptTokens: estimatedTokens,
                totalTokens: estimatedTokens,
            },
        };
    }
}
exports.HuggingFaceEmbeddingProvider = HuggingFaceEmbeddingProvider;
//# sourceMappingURL=huggingface-provider.js.map