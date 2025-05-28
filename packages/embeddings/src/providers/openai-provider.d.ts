import { EmbeddingProvider, EmbeddingRequest, EmbeddingResponse, EmbeddingModel } from '../types';
export declare class OpenAIEmbeddingProvider implements EmbeddingProvider {
    name: string;
    supportedModels: EmbeddingModel[];
    private client;
    constructor(config: {
        apiKey: string;
        baseURL?: string;
    });
    isConfigured(): boolean;
    getDefaultModel(): string;
    getDimensions(model: string): number;
    getMaxTokens(model: string): number;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
//# sourceMappingURL=openai-provider.d.ts.map