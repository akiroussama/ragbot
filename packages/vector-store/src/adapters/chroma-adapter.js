"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromaAdapter = void 0;
const chromadb_1 = require("chromadb");
const common_1 = require("@nestjs/common");
class ChromaAdapter {
    name = 'chroma';
    logger = new common_1.Logger(ChromaAdapter.name);
    client;
    config;
    collections = new Map();
    constructor(config = {}) {
        this.config = config;
        const clientConfig = {};
        if (config.path) {
            clientConfig.path = config.path;
        }
        else {
            clientConfig.host = config.host || 'localhost';
            clientConfig.port = config.port || 8000;
            clientConfig.ssl = config.ssl || false;
        }
        if (config.auth) {
            clientConfig.auth = config.auth;
        }
        this.client = new chromadb_1.ChromaApi(clientConfig);
    }
    async initialize() {
        try {
            await this.client.listCollections();
            this.logger.log('Chroma client initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Chroma client', error);
            throw new Error(`Chroma initialization failed: ${error.message}`);
        }
    }
    async createCollection(name, dimensions, options = {}) {
        const collectionName = this.getCollectionName(name);
        try {
            const createParams = {
                name: collectionName,
                metadata: {
                    dimensions,
                    ...options.metadata,
                },
            };
            if (options.embeddingFunction) {
                createParams.embeddingFunction = options.embeddingFunction;
            }
            await this.client.createCollection(createParams);
            this.logger.log(`Created Chroma collection: ${collectionName}`);
        }
        catch (error) {
            if (error.message?.includes('already exists')) {
                this.logger.warn(`Collection ${collectionName} already exists`);
                return;
            }
            throw new Error(`Failed to create collection ${collectionName}: ${error.message}`);
        }
    }
    async deleteCollection(name) {
        const collectionName = this.getCollectionName(name);
        try {
            await this.client.deleteCollection({ name: collectionName });
            this.collections.delete(collectionName);
            this.logger.log(`Deleted Chroma collection: ${collectionName}`);
        }
        catch (error) {
            throw new Error(`Failed to delete collection ${collectionName}: ${error.message}`);
        }
    }
    async upsert(collectionName, documents, options = {}) {
        const collection = await this.getCollection(collectionName);
        try {
            const ids = documents.map((doc) => doc.id);
            const embeddings = documents.map((doc) => doc.vector);
            const metadatas = documents.map((doc) => ({
                ...doc.metadata,
                tenantId: doc.tenantId,
            }));
            const documentsData = documents.map((doc) => doc.content);
            await collection.upsert({
                ids,
                embeddings,
                metadatas,
                documents: documentsData,
            });
            this.logger.debug(`Upserted ${documents.length} documents to ${collectionName}`);
        }
        catch (error) {
            throw new Error(`Failed to upsert documents to ${collectionName}: ${error.message}`);
        }
    }
    async search(collectionName, queryVector, options = {}) {
        const collection = await this.getCollection(collectionName);
        try {
            const queryParams = {
                queryEmbeddings: [queryVector],
                nResults: options.limit || 10,
                include: ['metadatas', 'documents', 'distances'],
            };
            if (options.includeVectors) {
                queryParams.include.push('embeddings');
            }
            // Build where filter
            const where = {};
            if (options.tenantId) {
                where.tenantId = { $eq: options.tenantId };
            }
            if (options.filter) {
                for (const [key, value] of Object.entries(options.filter)) {
                    if (Array.isArray(value)) {
                        where[key] = { $in: value };
                    }
                    else if (typeof value === 'object' && value !== null) {
                        if (value.gte !== undefined || value.lte !== undefined) {
                            const range = {};
                            if (value.gte !== undefined)
                                range.$gte = value.gte;
                            if (value.lte !== undefined)
                                range.$lte = value.lte;
                            where[key] = range;
                        }
                        else {
                            where[key] = { $eq: value };
                        }
                    }
                    else {
                        where[key] = { $eq: value };
                    }
                }
            }
            if (Object.keys(where).length > 0) {
                queryParams.where = where;
            }
            const response = await collection.query(queryParams);
            const results = [];
            for (let i = 0; i < (response.ids?.[0]?.length || 0); i++) {
                const distance = response.distances?.[0]?.[i] || 0;
                const score = 1 - distance; // Convert distance to similarity score
                if (options.scoreThreshold === undefined || score >= options.scoreThreshold) {
                    const metadata = response.metadatas?.[0]?.[i] || {};
                    const { tenantId, ...cleanMetadata } = metadata;
                    results.push({
                        id: response.ids[0][i],
                        score,
                        content: response.documents?.[0]?.[i] || '',
                        metadata: cleanMetadata,
                        tenantId: tenantId,
                        vector: response.embeddings?.[0]?.[i],
                    });
                }
            }
            return results;
        }
        catch (error) {
            throw new Error(`Failed to search in collection ${collectionName}: ${error.message}`);
        }
    }
    async delete(collectionName, ids, options = {}) {
        const collection = await this.getCollection(collectionName);
        try {
            await collection.delete({ ids });
            this.logger.debug(`Deleted ${ids.length} documents from ${collectionName}`);
        }
        catch (error) {
            throw new Error(`Failed to delete documents from ${collectionName}: ${error.message}`);
        }
    }
    async batchUpsert(collectionName, documents, batchSize = 100, options = {}) {
        const batches = this.chunkArray(documents, batchSize);
        for (let i = 0; i < batches.length; i++) {
            await this.upsert(collectionName, batches[i], options);
            this.logger.debug(`Processed batch ${i + 1}/${batches.length}`);
        }
    }
    async getCollectionInfo(name) {
        const collectionName = this.getCollectionName(name);
        try {
            const collection = await this.getCollection(name);
            const count = await collection.count();
            return {
                name: collectionName,
                dimensions: 0, // Chroma doesn't expose dimensions easily
                documentCount: count,
                indexedCount: count,
                storageSize: 0, // Chroma doesn't provide storage size
            };
        }
        catch (error) {
            throw new Error(`Failed to get collection info for ${collectionName}: ${error.message}`);
        }
    }
    async listCollections() {
        try {
            const collections = await this.client.listCollections();
            const prefix = this.config.collectionPrefix ? `${this.config.collectionPrefix}_` : '';
            return collections
                .map((collection) => collection.name)
                .filter((name) => !prefix || name.startsWith(prefix))
                .map((name) => prefix ? name.substring(prefix.length) : name);
        }
        catch (error) {
            throw new Error(`Failed to list collections: ${error.message}`);
        }
    }
    async getStats() {
        try {
            const collections = await this.client.listCollections();
            let totalDocuments = 0;
            for (const collectionInfo of collections) {
                try {
                    const collection = await this.client.getCollection({ name: collectionInfo.name });
                    const count = await collection.count();
                    totalDocuments += count;
                }
                catch (error) {
                    this.logger.warn(`Failed to get stats for collection ${collectionInfo.name}`, error);
                }
            }
            return {
                totalCollections: collections.length,
                totalDocuments,
                totalStorageSize: 0, // Chroma doesn't provide storage size
                provider: this.name,
            };
        }
        catch (error) {
            throw new Error(`Failed to get Chroma stats: ${error.message}`);
        }
    }
    async healthCheck() {
        try {
            await this.client.heartbeat();
            return true;
        }
        catch (error) {
            this.logger.error('Chroma health check failed', error);
            return false;
        }
    }
    async getCollection(collectionName) {
        const fullName = this.getCollectionName(collectionName);
        if (!this.collections.has(fullName)) {
            const collection = await this.client.getCollection({ name: fullName });
            this.collections.set(fullName, collection);
        }
        return this.collections.get(fullName);
    }
    getCollectionName(name) {
        return this.config.collectionPrefix ? `${this.config.collectionPrefix}_${name}` : name;
    }
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
exports.ChromaAdapter = ChromaAdapter;
//# sourceMappingURL=chroma-adapter.js.map