export interface EmbeddingRequest {
  texts: string[];
  model?: string;
  options?: Record<string, any>;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingProvider {
  name: string;
  supportedModels: string[];
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  isConfigured(): boolean;
  getDefaultModel(): string;
  getDimensions(model: string): number;
  getMaxTokens(model: string): number;
}

export interface EmbeddingServiceConfig {
  defaultProvider: string;
  fallbackProvider?: string;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  providers: {
    openai?: {
      apiKey: string;
      baseURL?: string;
    };
    anthropic?: {
      apiKey: string;
    };
    cohere?: {
      apiKey: string;
    };
    huggingface?: {
      apiKey: string;
      endpointUrl?: string;
    };
  };
}

export enum EmbeddingModel {
  // OpenAI
  OPENAI_ADA_002 = 'text-embedding-ada-002',
  OPENAI_3_SMALL = 'text-embedding-3-small',
  OPENAI_3_LARGE = 'text-embedding-3-large',
  
  // Anthropic (hypothetical)
  ANTHROPIC_EMBED_1 = 'anthropic-embed-1',
  
  // Cohere
  COHERE_EMBED_ENGLISH = 'embed-english-v3.0',
  COHERE_EMBED_MULTILINGUAL = 'embed-multilingual-v3.0',
  
  // HuggingFace
  SENTENCE_TRANSFORMERS_ALL_MINILM = 'sentence-transformers/all-MiniLM-L6-v2',
  SENTENCE_TRANSFORMERS_ALL_MPNET = 'sentence-transformers/all-mpnet-base-v2',
  
  // Local models
  LOCAL_SENTENCET5 = 'local/sentence-t5-base',
}

export interface EmbeddingStats {
  totalRequests: number;
  totalTokens: number;
  averageLatency: number;
  providerUsage: Record<string, number>;
  errorRate: number;
}