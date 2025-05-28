export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface WidgetConfig {
  apiKey: string;
  baseUrl?: string;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
  greetingMessage?: string;
  placeholder?: string;
  showBranding?: boolean;
  allowFileUpload?: boolean;
  enableSounds?: boolean;
  persistConversation?: boolean;
  language?: string;
  customStyles?: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface WebCrawlConfig {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  respectRobotsTxt?: boolean;
  waitTime?: number;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
    section?: string;
    [key: string]: any;
  };
  embedding?: number[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  highlights?: string[];
}