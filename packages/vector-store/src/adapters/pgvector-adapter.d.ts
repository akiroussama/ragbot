import { VectorStoreAdapter, VectorDocument, SearchResult, SearchOptions, UpsertOptions, CollectionInfo, VectorStoreStats } from '../types';
export interface PgVectorConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    schema?: string;
    tablePrefix?: string;
    maxConnections?: number;
}
export declare class PgVectorAdapter implements VectorStoreAdapter {
    readonly name = "pgvector";
    private readonly logger;
    private pool;
    private config;
    private schema;
    constructor(config: PgVectorConfig);
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
    close(): Promise<void>;
    private getTableName;
    private getDistanceFunction;
    private chunkArray;
}
//# sourceMappingURL=pgvector-adapter.d.ts.map