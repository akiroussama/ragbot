import { VectorStoreAdapter, VectorDocument, SearchResult, SearchOptions, UpsertOptions, CollectionInfo, VectorStoreStats } from '../types';
export interface PineconeConfig {
    apiKey: string;
    environment?: string;
    projectName?: string;
    indexPrefix?: string;
}
export declare class PineconeAdapter implements VectorStoreAdapter {
    readonly name = "pinecone";
    private readonly logger;
    private client;
    private config;
    private indexes;
    constructor(config: PineconeConfig);
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
    private getIndex;
    private getIndexName;
    private chunkArray;
}
//# sourceMappingURL=pinecone-adapter.d.ts.map