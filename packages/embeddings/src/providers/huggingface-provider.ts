import { HfInference } from '@huggingface/inference';
import { EmbeddingProvider, EmbeddingRequest, EmbeddingResponse, EmbeddingModel } from '../types';

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  name = 'huggingface';
  supportedModels = [
    EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MINILM,
    EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MPNET,
  ];

  private client: HfInference;
  private endpointUrl?: string;

  constructor(config: { apiKey: string; endpointUrl?: string }) {
    this.client = new HfInference(config.apiKey);
    this.endpointUrl = config.endpointUrl;
  }

  isConfigured(): boolean {
    return !!this.client.accessToken;
  }

  getDefaultModel(): string {
    return EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MINILM;
  }

  getDimensions(model: string): number {
    const dimensionMap: Record<string, number> = {
      [EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MINILM]: 384,
      [EmbeddingModel.SENTENCE_TRANSFORMERS_ALL_MPNET]: 768,
    };
    return dimensionMap[model] || 384;
  }

  getMaxTokens(model: string): number {
    return 512; // Typical for sentence transformers
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || this.getDefaultModel();
    
    if (!this.supportedModels.includes(model as EmbeddingModel)) {
      throw new Error(`Model ${model} not supported by HuggingFace provider`);
    }

    const embeddings: number[][] = [];

    // Process texts individually as HF Inference API handles single texts
    for (const text of request.texts) {
      const response = await this.client.featureExtraction({
        model,
        inputs: text,
        options: {
          use_cache: false,
          wait_for_model: true,
          ...request.options,
        },
      });

      // Handle different response formats
      let embedding: number[];
      if (Array.isArray(response) && Array.isArray(response[0])) {
        // Pooled embeddings (take mean)
        embedding = (response as number[][]).reduce((acc, vec) => {
          return acc.map((val, idx) => val + vec[idx]);
        }).map(val => val / (response as number[][]).length);
      } else {
        embedding = response as number[];
      }

      embeddings.push(embedding);
    }

    // Estimate token usage
    const estimatedTokens = Math.ceil(
      request.texts.reduce((sum, text) => sum + text.length, 0) / 4
    );

    return {
      embeddings,
      model,
      dimensions: this.getDimensions(model),
      usage: {
        promptTokens: estimatedTokens,
        totalTokens: estimatedTokens,
      },
    };
  }
}