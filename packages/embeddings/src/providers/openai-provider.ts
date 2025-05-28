import OpenAI from 'openai';
import { EmbeddingProvider, EmbeddingRequest, EmbeddingResponse, EmbeddingModel } from '../types';
import { encoding_for_model } from 'tiktoken';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  supportedModels = [
    EmbeddingModel.OPENAI_ADA_002,
    EmbeddingModel.OPENAI_3_SMALL,
    EmbeddingModel.OPENAI_3_LARGE,
  ];

  private client: OpenAI;

  constructor(config: { apiKey: string; baseURL?: string }) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  isConfigured(): boolean {
    return !!this.client.apiKey;
  }

  getDefaultModel(): string {
    return EmbeddingModel.OPENAI_3_SMALL;
  }

  getDimensions(model: string): number {
    const dimensionMap: Record<string, number> = {
      [EmbeddingModel.OPENAI_ADA_002]: 1536,
      [EmbeddingModel.OPENAI_3_SMALL]: 1536,
      [EmbeddingModel.OPENAI_3_LARGE]: 3072,
    };
    return dimensionMap[model] || 1536;
  }

  getMaxTokens(model: string): number {
    const tokenLimits: Record<string, number> = {
      [EmbeddingModel.OPENAI_ADA_002]: 8191,
      [EmbeddingModel.OPENAI_3_SMALL]: 8191,
      [EmbeddingModel.OPENAI_3_LARGE]: 8191,
    };
    return tokenLimits[model] || 8191;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || this.getDefaultModel();
    
    if (!this.supportedModels.includes(model as EmbeddingModel)) {
      throw new Error(`Model ${model} not supported by OpenAI provider`);
    }

    // Count tokens for usage tracking
    let totalTokens = 0;
    try {
      const encoding = encoding_for_model(model as any);
      totalTokens = request.texts.reduce((sum, text) => {
        const tokens = encoding.encode(text);
        return sum + tokens.length;
      }, 0);
      encoding.free();
    } catch {
      // Fallback to character estimation
      totalTokens = Math.ceil(
        request.texts.reduce((sum, text) => sum + text.length, 0) / 4
      );
    }

    const response = await this.client.embeddings.create({
      model,
      input: request.texts,
      encoding_format: 'float',
      ...request.options,
    });

    return {
      embeddings: response.data.map(item => item.embedding),
      model: response.model,
      dimensions: this.getDimensions(model),
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }
}