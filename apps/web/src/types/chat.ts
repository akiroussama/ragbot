export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    model?: string
    provider?: string
    usage?: TokenUsage
    retrievedDocuments?: string[]
  }
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost?: number
}

export interface RetrievedDocument {
  id: string
  content: string
  score: number
  metadata: Record<string, any>
  source?: string
  chunkId?: string
}

export interface ChatRequest {
  message: string
  conversationId?: string
  systemPrompt?: string
  retrievalOptions?: {
    enabled?: boolean
    maxDocuments?: number
    scoreThreshold?: number
  }
  generationOptions?: {
    model?: string
    provider?: string
    temperature?: number
    maxTokens?: number
    stream?: boolean
  }
}

export interface ChatResponse {
  id: string
  conversationId: string
  message: Message
  retrievedDocuments?: RetrievedDocument[]
  usage?: TokenUsage
  metadata?: {
    retrievalTime?: number
    generationTime?: number
    totalTime: number
    model: string
    provider: string
  }
}

export interface StreamChatResponse {
  id: string
  conversationId: string
  type: 'start' | 'content' | 'retrieval' | 'end' | 'error'
  content?: string
  retrievedDocuments?: RetrievedDocument[]
  usage?: TokenUsage
  metadata?: Record<string, any>
  error?: string
}