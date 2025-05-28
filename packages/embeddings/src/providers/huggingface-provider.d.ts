import { EmbeddingProvider, EmbeddingRequest, EmbeddingResponse, EmbeddingModel } from '../types';
export declare class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
    name: string;
    supportedModels: EmbeddingModel[];
    private client;
    private endpointUrl?;
    constructor(config: {
        apiKey: string;
        endpointUrl?: string;
    });
    isConfigured(): boolean;
    getDefaultModel(): string;
    getDimensions(model: string): number;
    getMaxTokens(model: string): number;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
//# sourceMappingURL=huggingface-provider.d.ts.map