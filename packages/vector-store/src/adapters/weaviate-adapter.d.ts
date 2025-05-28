import { VectorStoreAdapter, VectorDocument, SearchResult, SearchOptions, UpsertOptions, CollectionInfo, VectorStoreStats } from '../types';
export interface WeaviateConfig {
    scheme: 'http' | 'https';
    host: string;
    apiKey?: string;
    classPrefix?: string;
    headers?: Record<string, string>;
}
export declare class WeaviateAdapter implements VectorStoreAdapter {
    readonly name = "weaviate";
    private readonly logger;
    private client;
    private config;
    constructor(config: WeaviateConfig);
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
    private getClassName;
    private chunkArray;
}
//# sourceMappingURL=weaviate-adapter.d.ts.map