import { EmbeddingProvider, EmbeddingRequest, EmbeddingResponse, EmbeddingModel } from '../types';
export declare class CohereEmbeddingProvider implements EmbeddingProvider {
    name: string;
    supportedModels: EmbeddingModel[];
    private client;
    constructor(config: {
        apiKey: string;
    });
    isConfigured(): boolean;
    getDefaultModel(): string;
    getDimensions(model: string): number;
    getMaxTokens(model: string): number;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
//# sourceMappingURL=cohere-provider.d.ts.map