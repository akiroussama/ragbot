export interface VectorDocument {
    id: string;
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
}
export interface SearchResult {
    id: string;
    score: number;
    content: string;
    metadata: Record<string, any>;
}
export interface SearchOptions {
    limit?: number;
    threshold?: number;
    filter?: Record<string, any>;
    includeMetadata?: boolean;
    includeEmbeddings?: boolean;
}
export interface UpsertOptions {
    batchSize?: number;
    namespace?: string;
}
export interface VectorStoreAdapter {
    name: string;
    createCollection(name: string, dimensions: number, options?: any): Promise<void>;
    deleteCollection(name: string): Promise<void>;
    listCollections(): Promise<string[]>;
    collectionExists(name: string): Promise<boolean>;
    getCollectionInfo(name: string): Promise<CollectionInfo>;
    upsert(collectionName: string, documents: VectorDocument[], options?: UpsertOptions): Promise<void>;
    search(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<SearchResult[]>;
    delete(collectionName: string, ids: string[]): Promise<void>;
    deleteByFilter(collectionName: string, filter: Record<string, any>): Promise<void>;
    get(collectionName: string, ids: string[]): Promise<VectorDocument[]>;
    batchUpsert(collectionName: string, documents: VectorDocument[][], options?: UpsertOptions): Promise<void>;
    batchSearch(collectionName: string, queryVectors: number[][], options?: SearchOptions): Promise<SearchResult[][]>;
    isHealthy(): Promise<boolean>;
    getStats(collectionName?: string): Promise<VectorStoreStats>;
}
export interface CollectionInfo {
    name: string;
    dimensions: number;
    documentCount: number;
    indexType?: string;
    created: Date;
    updated: Date;
    config?: Record<string, any>;
}
export interface VectorStoreStats {
    totalCollections: number;
    totalDocuments: number;
    totalSize: number;
    memoryUsage?: number;
    diskUsage?: number;
    indexingStatus?: string;
}
export interface VectorStoreConfig {
    provider: 'qdrant' | 'pinecone' | 'weaviate' | 'chroma' | 'pgvector';
    connection: {
        url?: string;
        apiKey?: string;
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
        ssl?: boolean;
        [key: string]: any;
    };
    defaultCollection?: string;
    batchSize?: number;
    timeout?: number;
    retries?: number;
}
export declare enum DistanceMetric {
    COSINE = "cosine",
    EUCLIDEAN = "euclidean",
    DOT_PRODUCT = "dot",
    MANHATTAN = "manhattan"
}
export interface IndexConfig {
    metric: DistanceMetric;
    efConstruction?: number;
    m?: number;
    quantization?: {
        type: 'scalar' | 'product';
        bits?: number;
    };
}
//# sourceMappingURL=types.d.ts.map