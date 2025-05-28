"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStore = void 0;
const adapters_1 = require("./adapters");
const common_1 = require("@nestjs/common");
class VectorStore {
    logger = new common_1.Logger(VectorStore.name);
    adapter;
    options;
    healthCheckTimer;
    metrics = {
        operations: 0,
        errors: 0,
        isHealthy: true,
    };
    constructor(config, options = {}) {
        this.options = {
            enableHealthCheck: true,
            healthCheckInterval: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelay: 1000,
            enableMetrics: true,
            ...options,
        };
        this.adapter = this.createAdapter(config);
    }
    async initialize() {
        try {
            await this.adapter.initialize();
            if (this.options.enableHealthCheck) {
                this.startHealthCheck();
            }
            this.logger.log(`Vector store initialized with provider: ${this.adapter.name}`);
        }
        catch (error) {
            this.logger.error('Failed to initialize vector store', error);
            throw error;
        }
    }
    async createCollection(name, dimensions, options) {
        return this.executeWithRetry(() => this.adapter.createCollection(name, dimensions, options));
    }
    async deleteCollection(name) {
        return this.executeWithRetry(() => this.adapter.deleteCollection(name));
    }
    async upsert(collectionName, documents, options) {
        return this.executeWithRetry(() => this.adapter.upsert(collectionName, documents, options));
    }
    async search(collectionName, queryVector, options) {
        return this.executeWithRetry(() => this.adapter.search(collectionName, queryVector, options));
    }
    async delete(collectionName, ids, options) {
        return this.executeWithRetry(() => this.adapter.delete(collectionName, ids, options));
    }
    async batchUpsert(collectionName, documents, batchSize, options) {
        return this.executeWithRetry(() => this.adapter.batchUpsert(collectionName, documents, batchSize, options));
    }
    async getCollectionInfo(name) {
        return this.executeWithRetry(() => this.adapter.getCollectionInfo(name));
    }
    async listCollections() {
        return this.executeWithRetry(() => this.adapter.listCollections());
    }
    async getStats() {
        return this.executeWithRetry(() => this.adapter.getStats());
    }
    async healthCheck() {
        try {
            const isHealthy = await this.adapter.healthCheck();
            this.metrics.isHealthy = isHealthy;
            this.metrics.lastHealthCheck = new Date();
            return isHealthy;
        }
        catch (error) {
            this.logger.error('Health check failed', error);
            this.metrics.isHealthy = false;
            this.metrics.lastHealthCheck = new Date();
            return false;
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getProvider() {
        return this.adapter.name;
    }
    async destroy() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        // Close adapter if it has a close method
        if ('close' in this.adapter && typeof this.adapter.close === 'function') {
            await this.adapter.close();
        }
        this.logger.log('Vector store destroyed');
    }
    createAdapter(config) {
        switch (config.provider) {
            case 'qdrant':
                return new adapters_1.QdrantAdapter(config.config);
            case 'pinecone':
                return new adapters_1.PineconeAdapter(config.config);
            case 'weaviate':
                return new adapters_1.WeaviateAdapter(config.config);
            case 'chroma':
                return new adapters_1.ChromaAdapter(config.config);
            case 'pgvector':
                return new adapters_1.PgVectorAdapter(config.config);
            default:
                throw new Error(`Unsupported vector store provider: ${config.provider}`);
        }
    }
    async executeWithRetry(operation) {
        let lastError;
        for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
            try {
                if (this.options.enableMetrics) {
                    this.metrics.operations++;
                }
                const result = await operation();
                // Reset error count on success
                if (attempt > 1) {
                    this.logger.log(`Operation succeeded after ${attempt} attempts`);
                }
                return result;
            }
            catch (error) {
                lastError = error;
                if (this.options.enableMetrics) {
                    this.metrics.errors++;
                }
                if (attempt === this.options.retryAttempts) {
                    this.logger.error(`Operation failed after ${attempt} attempts: ${error.message}`, error);
                    throw error;
                }
                this.logger.warn(`Operation failed (attempt ${attempt}/${this.options.retryAttempts}): ${error.message}. Retrying in ${this.options.retryDelay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay));
            }
        }
        throw lastError;
    }
    startHealthCheck() {
        this.healthCheckTimer = setInterval(async () => {
            try {
                await this.healthCheck();
            }
            catch (error) {
                this.logger.error('Scheduled health check failed', error);
            }
        }, this.options.healthCheckInterval);
        this.logger.log(`Health check started with interval: ${this.options.healthCheckInterval}ms`);
    }
}
exports.VectorStore = VectorStore;
//# sourceMappingURL=vector-store.js.map