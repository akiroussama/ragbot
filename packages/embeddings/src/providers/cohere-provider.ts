import { CohereClient } from 'cohere-ai';
import { EmbeddingProvider, EmbeddingRequest, EmbeddingResponse, EmbeddingModel } from '../types';

export class CohereEmbeddingProvider implements EmbeddingProvider {
  name = 'cohere';
  supportedModels = [
    EmbeddingModel.COHERE_EMBED_ENGLISH,
    EmbeddingModel.COHERE_EMBED_MULTILINGUAL,
  ];

  private client: CohereClient;

  constructor(config: { apiKey: string }) {
    this.client = new CohereClient({
      token: config.apiKey,
    });
  }

  isConfigured(): boolean {
    return !!this.client.token;
  }

  getDefaultModel(): string {
    return EmbeddingModel.COHERE_EMBED_MULTILINGUAL;
  }

  getDimensions(model: string): number {
    const dimensionMap: Record<string, number> = {
      [EmbeddingModel.COHERE_EMBED_ENGLISH]: 1024,
      [EmbeddingModel.COHERE_EMBED_MULTILINGUAL]: 1024,
    };
    return dimensionMap[model] || 1024;
  }

  getMaxTokens(model: string): number {
    return 512; // Cohere's typical context length
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || this.getDefaultModel();
    
    if (!this.supportedModels.includes(model as EmbeddingModel)) {
      throw new Error(`Model ${model} not supported by Cohere provider`);
    }

    const response = await this.client.embed({
      model,
      texts: request.texts,
      inputType: 'search_document',
      embeddingTypes: ['float'],
      ...request.options,
    });

    // Estimate token usage (Cohere doesn't provide exact counts)
    const estimatedTokens = Math.ceil(
      request.texts.reduce((sum, text) => sum + text.length, 0) / 4
    );

    return {
      embeddings: response.embeddings.float || [],
      model,
      dimensions: this.getDimensions(model),
      usage: {
        promptTokens: estimatedTokens,
        totalTokens: estimatedTokens,
      },
    };
  }
}