import { EmbeddingResponse, EmbeddingServiceConfig, EmbeddingStats } from './types';
export declare class EmbeddingService {
    private config;
    private providers;
    private queue;
    private stats;
    constructor(config: EmbeddingServiceConfig);
    private initializeProviders;
    embed(texts: string | string[], options?: {
        model?: string;
        provider?: string;
        batchSize?: number;
    }): Promise<EmbeddingResponse>;
    embedQuery(query: string, options?: {
        model?: string;
        provider?: string;
    }): Promise<number[]>;
    embedDocuments(documents: string[], options?: {
        model?: string;
        provider?: string;
        batchSize?: number;
    }): Promise<number[][]>;
    private getProvider;
    private updateStats;
    getStats(): EmbeddingStats;
    getAvailableProviders(): string[];
    getProviderModels(providerName: string): string[];
    validateModel(model: string, provider?: string): Promise<boolean>;
    testProvider(providerName: string): Promise<boolean>;
    static cosineSimilarity(a: number[], b: number[]): number;
    static euclideanDistance(a: number[], b: number[]): number;
    static dotProduct(a: number[], b: number[]): number;
}
//# sourceMappingURL=embedding-service.d.ts.map