import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VectorDocument, SearchResult, SearchOptions, UpsertOptions, CollectionInfo, VectorStoreStats } from './types';
export declare class VectorStoreService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private vectorStore;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
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
    private getVectorStoreConfig;
}
//# sourceMappingURL=vector-store.service.d.ts.map