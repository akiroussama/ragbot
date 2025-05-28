import { VectorStoreAdapter, VectorDocument, SearchResult, SearchOptions, UpsertOptions, CollectionInfo, VectorStoreStats } from '../types';
export interface ChromaConfig {
    path?: string;
    host?: string;
    port?: number;
    ssl?: boolean;
    auth?: {
        provider: string;
        credentials?: string;
        tokenHeaderType?: string;
    };
    collectionPrefix?: string;
}
export declare class ChromaAdapter implements VectorStoreAdapter {
    readonly name = "chroma";
    private readonly logger;
    private client;
    private config;
    private collections;
    constructor(config?: ChromaConfig);
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
    private getCollection;
    private getCollectionName;
    private chunkArray;
}
//# sourceMappingURL=chroma-adapter.d.ts.map