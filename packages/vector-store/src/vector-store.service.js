"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStoreService = void 0;
const common_1 = require("@nestjs/common");
const vector_store_1 = require("./vector-store");
let VectorStoreService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var VectorStoreService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            VectorStoreService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        configService;
        vectorStore;
        constructor(configService) {
            this.configService = configService;
        }
        async onModuleInit() {
            const config = this.getVectorStoreConfig();
            this.vectorStore = new vector_store_1.VectorStore(config, {
                enableHealthCheck: this.configService.get('VECTOR_STORE_HEALTH_CHECK', true),
                healthCheckInterval: this.configService.get('VECTOR_STORE_HEALTH_CHECK_INTERVAL', 30000),
                retryAttempts: this.configService.get('VECTOR_STORE_RETRY_ATTEMPTS', 3),
                retryDelay: this.configService.get('VECTOR_STORE_RETRY_DELAY', 1000),
                enableMetrics: this.configService.get('VECTOR_STORE_ENABLE_METRICS', true),
            });
            await this.vectorStore.initialize();
        }
        async onModuleDestroy() {
            if (this.vectorStore) {
                await this.vectorStore.destroy();
            }
        }
        async createCollection(name, dimensions, options) {
            return this.vectorStore.createCollection(name, dimensions, options);
        }
        async deleteCollection(name) {
            return this.vectorStore.deleteCollection(name);
        }
        async upsert(collectionName, documents, options) {
            return this.vectorStore.upsert(collectionName, documents, options);
        }
        async search(collectionName, queryVector, options) {
            return this.vectorStore.search(collectionName, queryVector, options);
        }
        async delete(collectionName, ids, options) {
            return this.vectorStore.delete(collectionName, ids, options);
        }
        async batchUpsert(collectionName, documents, batchSize, options) {
            return this.vectorStore.batchUpsert(collectionName, documents, batchSize, options);
        }
        async getCollectionInfo(name) {
            return this.vectorStore.getCollectionInfo(name);
        }
        async listCollections() {
            return this.vectorStore.listCollections();
        }
        async getStats() {
            return this.vectorStore.getStats();
        }
        async healthCheck() {
            return this.vectorStore.healthCheck();
        }
        getMetrics() {
            return this.vectorStore.getMetrics();
        }
        getProvider() {
            return this.vectorStore.getProvider();
        }
        getVectorStoreConfig() {
            const provider = this.configService.get('VECTOR_STORE_PROVIDER', 'qdrant');
            switch (provider) {
                case 'qdrant':
                    return {
                        provider: 'qdrant',
                        config: {
                            url: this.configService.get('QDRANT_URL', 'http://localhost:6333'),
                            apiKey: this.configService.get('QDRANT_API_KEY'),
                            timeout: this.configService.get('QDRANT_TIMEOUT', 30000),
                            prefix: this.configService.get('QDRANT_PREFIX'),
                        },
                    };
                case 'pinecone':
                    return {
                        provider: 'pinecone',
                        config: {
                            apiKey: this.configService.getOrThrow('PINECONE_API_KEY'),
                            environment: this.configService.get('PINECONE_ENVIRONMENT'),
                            projectName: this.configService.get('PINECONE_PROJECT_NAME'),
                            indexPrefix: this.configService.get('PINECONE_INDEX_PREFIX'),
                        },
                    };
                case 'weaviate':
                    return {
                        provider: 'weaviate',
                        config: {
                            scheme: this.configService.get('WEAVIATE_SCHEME', 'http'),
                            host: this.configService.get('WEAVIATE_HOST', 'localhost:8080'),
                            apiKey: this.configService.get('WEAVIATE_API_KEY'),
                            classPrefix: this.configService.get('WEAVIATE_CLASS_PREFIX'),
                        },
                    };
                case 'chroma':
                    return {
                        provider: 'chroma',
                        config: {
                            host: this.configService.get('CHROMA_HOST', 'localhost'),
                            port: this.configService.get('CHROMA_PORT', 8000),
                            ssl: this.configService.get('CHROMA_SSL', false),
                            path: this.configService.get('CHROMA_PATH'),
                            collectionPrefix: this.configService.get('CHROMA_COLLECTION_PREFIX'),
                        },
                    };
                case 'pgvector':
                    return {
                        provider: 'pgvector',
                        config: {
                            host: this.configService.get('PGVECTOR_HOST', 'localhost'),
                            port: this.configService.get('PGVECTOR_PORT', 5432),
                            database: this.configService.getOrThrow('PGVECTOR_DATABASE'),
                            user: this.configService.getOrThrow('PGVECTOR_USER'),
                            password: this.configService.getOrThrow('PGVECTOR_PASSWORD'),
                            ssl: this.configService.get('PGVECTOR_SSL', false),
                            schema: this.configService.get('PGVECTOR_SCHEMA', 'public'),
                            tablePrefix: this.configService.get('PGVECTOR_TABLE_PREFIX'),
                            maxConnections: this.configService.get('PGVECTOR_MAX_CONNECTIONS', 20),
                        },
                    };
                default:
                    throw new Error(`Unsupported vector store provider: ${provider}`);
            }
        }
    };
    return VectorStoreService = _classThis;
})();
exports.VectorStoreService = VectorStoreService;
//# sourceMappingURL=vector-store.service.js.map