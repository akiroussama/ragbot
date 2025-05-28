export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  tenantId: string;
  userId?: string;
}

export interface ChatConversation {
  id: string;
  tenantId: string;
  userId?: string;
  title?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessageAt?: Date;
}

export interface ChatContext {
  conversationId: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  retrievedDocuments?: RetrievedDocument[];
  metadata?: Record<string, any>;
}

export interface RetrievedDocument {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  source?: string;
  chunkId?: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  tenantId: string;
  userId?: string;
  systemPrompt?: string;
  retrievalOptions?: RetrievalOptions;
  generationOptions?: GenerationOptions;
  metadata?: Record<string, any>;
}

export interface RetrievalOptions {
  enabled?: boolean;
  maxDocuments?: number;
  scoreThreshold?: number;
  includeMetadata?: boolean;
  filters?: Record<string, any>;
  collections?: string[];
  hybridSearch?: {
    enabled: boolean;
    keywordWeight?: number;
    semanticWeight?: number;
  };
  reranking?: {
    enabled: boolean;
    model?: string;
    topK?: number;
  };
}

export interface GenerationOptions {
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  systemPrompt?: string;
  contextWindow?: number;
  safetySettings?: SafetySettings;
}

export interface SafetySettings {
  enabled?: boolean;
  contentFilter?: {
    enabled: boolean;
    categories: string[];
    threshold: 'low' | 'medium' | 'high';
  };
  piiDetection?: {
    enabled: boolean;
    redactPii?: boolean;
  };
  toxicityFilter?: {
    enabled: boolean;
    threshold: number;
  };
}

export interface ChatResponse {
  id: string;
  conversationId: string;
  message: ChatMessage;
  retrievedDocuments?: RetrievedDocument[];
  usage?: TokenUsage;
  metadata?: {
    retrievalTime?: number;
    generationTime?: number;
    totalTime: number;
    model: string;
    provider: string;
    cached?: boolean;
  };
}

export interface StreamChatResponse {
  id: string;
  conversationId: string;
  type: 'start' | 'content' | 'retrieval' | 'end' | 'error';
  content?: string;
  retrievedDocuments?: RetrievedDocument[];
  usage?: TokenUsage;
  metadata?: Record<string, any>;
  error?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface ChatProvider {
  name: string;
  generateResponse(
    messages: ChatMessage[],
    options: GenerationOptions,
  ): Promise<{
    content: string;
    usage: TokenUsage;
    finishReason: string;
  }>;
  generateStreamResponse(
    messages: ChatMessage[],
    options: GenerationOptions,
  ): AsyncGenerator<{
    content: string;
    delta?: string;
    usage?: TokenUsage;
    finishReason?: string;
  }>;
  isAvailable(): Promise<boolean>;
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  summary: string;
  messageCount: number;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ChatAnalytics {
  totalConversations: number;
  totalMessages: number;
  averageResponseTime: number;
  popularTopics: Array<{
    topic: string;
    count: number;
  }>;
  userSatisfaction?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  modelUsage: Array<{
    provider: string;
    model: string;
    requestCount: number;
    avgResponseTime: number;
    totalCost?: number;
  }>;
}

export interface ChatFilter {
  tenantId?: string;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
  messageRole?: 'user' | 'assistant' | 'system';
  hasRetrievedDocuments?: boolean;
  model?: string;
  provider?: string;
  minScore?: number;
  maxScore?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type ChatProvider_Name = 'openai' | 'anthropic' | 'google' | 'cohere' | 'azure' | 'huggingface';

export interface ChatConfig {
  defaultProvider: ChatProvider_Name;
  defaultModel: string;
  maxContextWindow: number;
  defaultTemperature: number;
  maxRetries: number;
  timeout: number;
  enableRetrieval: boolean;
  enableStreaming: boolean;
  enableSafety: boolean;
  enableAnalytics: boolean;
  enableCaching: boolean;
}