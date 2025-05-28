import { VectorDocument, SearchResult, SearchOptions, UpsertOptions, CollectionInfo, VectorStoreStats } from './types';
import { type QdrantConfig, type PineconeConfig, type WeaviateConfig, type ChromaConfig, type PgVectorConfig } from './adapters';
export type VectorStoreProvider = 'qdrant' | 'pinecone' | 'weaviate' | 'chroma' | 'pgvector';
export type VectorStoreConfig = {
    provider: 'qdrant';
    config: QdrantConfig;
} | {
    provider: 'pinecone';
    config: PineconeConfig;
} | {
    provider: 'weaviate';
    config: WeaviateConfig;
} | {
    provider: 'chroma';
    config: ChromaConfig;
} | {
    provider: 'pgvector';
    config: PgVectorConfig;
};
export interface VectorStoreOptions {
    enableHealthCheck?: boolean;
    healthCheckInterval?: number;
    retryAttempts?: number;
    retryDelay?: number;
    enableMetrics?: boolean;
}
export declare class VectorStore {
    private readonly logger;
    private adapter;
    private options;
    private healthCheckTimer?;
    private metrics;
    constructor(config: VectorStoreConfig, options?: VectorStoreOptions);
    initialize(): Promise<void>;
    createCollection(name: string, dimensions: number, options?: any): Promise<void>;
    deleteCollection(name: string): Promise<void>;
    upsert(collectionName: string, documents: VectorDocument[], options?: UpsertOptions): Promise<void>;
    search(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<SearchResult[]>;
    delete(collectionName: string, ids: string[], options?: any): Promise<void>;
    batchUpsert(collectionName: string, documents: VectorDocument[], batchSize?: number, options?: UpsertOptions): Promise<void>;
    getCollectionInfo(name: string): Promise<CollectionInfo>;
    listCollections(): Promise<string[]>;
    getStats(): Promise<VectorStoreStats>;
    healthCheck(): Promise<boolean>;
    getMetrics(): {
        operations: number;
        errors: number;
        lastHealthCheck?: Date;
        isHealthy: boolean;
    };
    getProvider(): string;
    destroy(): Promise<void>;
    private createAdapter;
    private executeWithRetry;
    private startHealthCheck;
}
//# sourceMappingURL=vector-store.d.ts.map