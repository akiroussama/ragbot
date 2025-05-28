import PQueue from 'p-queue';
import pRetry from 'p-retry';
import { chunk } from '@chatbot-rag/shared';
import {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingServiceConfig,
  EmbeddingStats,
} from './types';
import {
  OpenAIEmbeddingProvider,
  CohereEmbeddingProvider,
  HuggingFaceEmbeddingProvider,
} from './providers';

export class EmbeddingService {
  private providers = new Map<string, EmbeddingProvider>();
  private queue: PQueue;
  private stats: EmbeddingStats = {
    totalRequests: 0,
    totalTokens: 0,
    averageLatency: 0,
    providerUsage: {},
    errorRate: 0,
  };

  constructor(private config: EmbeddingServiceConfig) {
    this.queue = new PQueue({ 
      concurrency: 5,
      timeout: config.timeout,
    });
    
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize OpenAI provider
    if (this.config.providers.openai) {
      const provider = new OpenAIEmbeddingProvider(this.config.providers.openai);
      if (provider.isConfigured()) {
        this.providers.set('openai', provider);
      }
    }

    // Initialize Cohere provider
    if (this.config.providers.cohere) {
      const provider = new CohereEmbeddingProvider(this.config.providers.cohere);
      if (provider.isConfigured()) {
        this.providers.set('cohere', provider);
      }
    }

    // Initialize HuggingFace provider
    if (this.config.providers.huggingface) {
      const provider = new HuggingFaceEmbeddingProvider(this.config.providers.huggingface);
      if (provider.isConfigured()) {
        this.providers.set('huggingface', provider);
      }
    }
  }

  async embed(
    texts: string | string[],
    options?: {
      model?: string;
      provider?: string;
      batchSize?: number;
    }
  ): Promise<EmbeddingResponse> {
    const textsArray = Array.isArray(texts) ? texts : [texts];
    const startTime = Date.now();

    try {
      // Determine provider
      const providerName = options?.provider || this.config.defaultProvider;
      const provider = this.getProvider(providerName);

      // Batch processing
      const batchSize = options?.batchSize || this.config.batchSize;
      const batches = chunk(textsArray, batchSize);
      
      const allEmbeddings: number[][] = [];
      let totalUsage = { promptTokens: 0, totalTokens: 0 };
      let responseModel = '';

      for (const batch of batches) {
        const request: EmbeddingRequest = {
          texts: batch,
          model: options?.model || provider.getDefaultModel(),
        };

        const response = await this.queue.add(() =>
          pRetry(() => provider.embed(request), {
            retries: this.config.retryAttempts,
            minTimeout: this.config.retryDelay,
            factor: 2,
          })
        );

        allEmbeddings.push(...response.embeddings);
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.totalTokens += response.usage.totalTokens;
        responseModel = response.model;
      }

      // Update stats
      this.updateStats(providerName, totalUsage.totalTokens, Date.now() - startTime);

      return {
        embeddings: allEmbeddings,
        model: responseModel,
        dimensions: provider.getDimensions(responseModel),
        usage: totalUsage,
      };
    } catch (error) {
      this.stats.errorRate = (this.stats.errorRate * this.stats.totalRequests + 1) / (this.stats.totalRequests + 1);
      
      // Try fallback provider if configured
      if (this.config.fallbackProvider && options?.provider !== this.config.fallbackProvider) {
        return this.embed(texts, {
          ...options,
          provider: this.config.fallbackProvider,
        });
      }

      throw error;
    }
  }

  async embedQuery(query: string, options?: { model?: string; provider?: string }): Promise<number[]> {
    const response = await this.embed([query], options);
    return response.embeddings[0];
  }

  async embedDocuments(
    documents: string[],
    options?: { model?: string; provider?: string; batchSize?: number }
  ): Promise<number[][]> {
    const response = await this.embed(documents, options);
    return response.embeddings;
  }

  private getProvider(providerName: string): EmbeddingProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      const availableProviders = Array.from(this.providers.keys());
      throw new Error(
        `Provider ${providerName} not configured. Available providers: ${availableProviders.join(', ')}`
      );
    }
    return provider;
  }

  private updateStats(provider: string, tokens: number, latency: number) {
    this.stats.totalRequests++;
    this.stats.totalTokens += tokens;
    this.stats.averageLatency = 
      (this.stats.averageLatency * (this.stats.totalRequests - 1) + latency) / this.stats.totalRequests;
    this.stats.providerUsage[provider] = (this.stats.providerUsage[provider] || 0) + 1;
  }

  getStats(): EmbeddingStats {
    return { ...this.stats };
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderModels(providerName: string): string[] {
    const provider = this.providers.get(providerName);
    return provider ? provider.supportedModels : [];
  }

  async validateModel(model: string, provider?: string): Promise<boolean> {
    try {
      const providerName = provider || this.config.defaultProvider;
      const embeddingProvider = this.getProvider(providerName);
      return embeddingProvider.supportedModels.includes(model);
    } catch {
      return false;
    }
  }

  async testProvider(providerName: string): Promise<boolean> {
    try {
      const provider = this.getProvider(providerName);
      await provider.embed({ texts: ['test'] });
      return true;
    } catch {
      return false;
    }
  }

  // Utility methods for similarity and search
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  static euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }

    return Math.sqrt(sum);
  }

  static dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }

    return sum;
  }
}