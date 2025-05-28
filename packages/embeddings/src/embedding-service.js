"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const p_queue_1 = __importDefault(require("p-queue"));
const p_retry_1 = __importDefault(require("p-retry"));
const shared_1 = require("@chatbot-rag/shared");
const providers_1 = require("./providers");
class EmbeddingService {
    config;
    providers = new Map();
    queue;
    stats = {
        totalRequests: 0,
        totalTokens: 0,
        averageLatency: 0,
        providerUsage: {},
        errorRate: 0,
    };
    constructor(config) {
        this.config = config;
        this.queue = new p_queue_1.default({
            concurrency: 5,
            timeout: config.timeout,
        });
        this.initializeProviders();
    }
    initializeProviders() {
        // Initialize OpenAI provider
        if (this.config.providers.openai) {
            const provider = new providers_1.OpenAIEmbeddingProvider(this.config.providers.openai);
            if (provider.isConfigured()) {
                this.providers.set('openai', provider);
            }
        }
        // Initialize Cohere provider
        if (this.config.providers.cohere) {
            const provider = new providers_1.CohereEmbeddingProvider(this.config.providers.cohere);
            if (provider.isConfigured()) {
                this.providers.set('cohere', provider);
            }
        }
        // Initialize HuggingFace provider
        if (this.config.providers.huggingface) {
            const provider = new providers_1.HuggingFaceEmbeddingProvider(this.config.providers.huggingface);
            if (provider.isConfigured()) {
                this.providers.set('huggingface', provider);
            }
        }
    }
    async embed(texts, options) {
        const textsArray = Array.isArray(texts) ? texts : [texts];
        const startTime = Date.now();
        try {
            // Determine provider
            const providerName = options?.provider || this.config.defaultProvider;
            const provider = this.getProvider(providerName);
            // Batch processing
            const batchSize = options?.batchSize || this.config.batchSize;
            const batches = (0, shared_1.chunk)(textsArray, batchSize);
            const allEmbeddings = [];
            let totalUsage = { promptTokens: 0, totalTokens: 0 };
            let responseModel = '';
            for (const batch of batches) {
                const request = {
                    texts: batch,
                    model: options?.model || provider.getDefaultModel(),
                };
                const response = await this.queue.add(() => (0, p_retry_1.default)(() => provider.embed(request), {
                    retries: this.config.retryAttempts,
                    minTimeout: this.config.retryDelay,
                    factor: 2,
                }));
                allEmbeddings.push(...response.embeddings);
                totalUsage.promptTokens += response.usage.promptTokens;
                totalUsage.totalTokens += response.usage.totalTokens;
                responseModel = response.model;
            }
            // Update stats
            this.updateStats(providerName, totalUsage.totalTokens, Date.now() - startTime);
            return {
                embeddings: allEmbeddings,
                model: responseModel,
                dimensions: provider.getDimensions(responseModel),
                usage: totalUsage,
            };
        }
        catch (error) {
            this.stats.errorRate = (this.stats.errorRate * this.stats.totalRequests + 1) / (this.stats.totalRequests + 1);
            // Try fallback provider if configured
            if (this.config.fallbackProvider && options?.provider !== this.config.fallbackProvider) {
                return this.embed(texts, {
                    ...options,
                    provider: this.config.fallbackProvider,
                });
            }
            throw error;
        }
    }
    async embedQuery(query, options) {
        const response = await this.embed([query], options);
        return response.embeddings[0];
    }
    async embedDocuments(documents, options) {
        const response = await this.embed(documents, options);
        return response.embeddings;
    }
    getProvider(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            const availableProviders = Array.from(this.providers.keys());
            throw new Error(`Provider ${providerName} not configured. Available providers: ${availableProviders.join(', ')}`);
        }
        return provider;
    }
    updateStats(provider, tokens, latency) {
        this.stats.totalRequests++;
        this.stats.totalTokens += tokens;
        this.stats.averageLatency =
            (this.stats.averageLatency * (this.stats.totalRequests - 1) + latency) / this.stats.totalRequests;
        this.stats.providerUsage[provider] = (this.stats.providerUsage[provider] || 0) + 1;
    }
    getStats() {
        return { ...this.stats };
    }
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    getProviderModels(providerName) {
        const provider = this.providers.get(providerName);
        return provider ? provider.supportedModels : [];
    }
    async validateModel(model, provider) {
        try {
            const providerName = provider || this.config.defaultProvider;
            const embeddingProvider = this.getProvider(providerName);
            return embeddingProvider.supportedModels.includes(model);
        }
        catch {
            return false;
        }
    }
    async testProvider(providerName) {
        try {
            const provider = this.getProvider(providerName);
            await provider.embed({ texts: ['test'] });
            return true;
        }
        catch {
            return false;
        }
    }
    // Utility methods for similarity and search
    static cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    static euclideanDistance(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }
    static dotProduct(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }
}
exports.EmbeddingService = EmbeddingService;
//# sourceMappingURL=embedding-service.js.map