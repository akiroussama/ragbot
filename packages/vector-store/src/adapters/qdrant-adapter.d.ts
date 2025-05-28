import { VectorStoreAdapter, VectorDocument, SearchResult, SearchOptions, UpsertOptions, CollectionInfo, VectorStoreStats } from '../types';
export interface QdrantConfig {
    url: string;
    apiKey?: string;
    timeout?: number;
    prefix?: string;
}
export declare class QdrantAdapter implements VectorStoreAdapter {
    readonly name = "qdrant";
    private readonly logger;
    private client;
    private config;
    constructor(config: QdrantConfig);
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
    private getCollectionName;
    private buildFilter;
    private chunkArray;
}
//# sourceMappingURL=qdrant-adapter.d.ts.map