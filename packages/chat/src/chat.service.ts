import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from '@chatbot-rag/embeddings';
import { VectorStoreService } from '@chatbot-rag/vector-store';
import {
  ChatRequest,
  ChatResponse,
  StreamChatResponse,
  ChatMessage,
  ChatConversation,
  ChatContext,
  RetrievedDocument,
  ChatProvider_Name,
  ChatConfig,
  GenerationOptions,
  RetrievalOptions,
} from './types';
import {
  OpenAIProvider,
  AnthropicProvider,
  type OpenAIConfig,
  type AnthropicConfig,
} from './providers';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private providers: Map<ChatProvider_Name, any> = new Map();
  private config: ChatConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {
    this.config = this.loadConfig();
    this.initializeProviders();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        request.conversationId,
        request.tenantId,
        request.userId,
      );
      
      // Create user message
      const userMessage = await this.createMessage(
        conversation.id,
        'user',
        request.message,
        request.tenantId,
        request.userId,
        request.metadata,
      );
      
      // Get conversation context
      const context = await this.buildContext(
        conversation.id,
        request.tenantId,
        request.systemPrompt,
      );
      
      // Perform retrieval if enabled
      let retrievedDocuments: RetrievedDocument[] = [];
      let retrievalTime = 0;
      
      if (request.retrievalOptions?.enabled !== false && this.config.enableRetrieval) {
        const retrievalStart = Date.now();
        retrievedDocuments = await this.performRetrieval(
          request.message,
          request.tenantId,
          request.retrievalOptions || {},
        );
        retrievalTime = Date.now() - retrievalStart;
      }
      
      // Build enhanced context with retrieved documents
      const enhancedContext = await this.enhanceContextWithRetrieval(
        context,
        retrievedDocuments,
        request.systemPrompt,
      );
      
      // Generate response
      const generationStart = Date.now();
      const provider = this.getProvider(request.generationOptions?.provider);
      const generationOptions: GenerationOptions = {
        ...this.getDefaultGenerationOptions(),
        ...request.generationOptions,
        stream: false,
      };
      
      const generation = await provider.generateResponse(
        enhancedContext.messages,
        generationOptions,
      );
      
      const generationTime = Date.now() - generationStart;
      
      // Create assistant message
      const assistantMessage = await this.createMessage(
        conversation.id,
        'assistant',
        generation.content,
        request.tenantId,
        request.userId,
        {
          retrievedDocuments: retrievedDocuments.map(doc => doc.id),
          model: generationOptions.model,
          provider: provider.name,
          usage: generation.usage,
        },
      );
      
      // Update conversation
      await this.updateConversation(conversation.id, {
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        messageCount: conversation.messageCount + 2,
      });
      
      const totalTime = Date.now() - startTime;
      
      return {
        id: assistantMessage.id,
        conversationId: conversation.id,
        message: assistantMessage,
        retrievedDocuments,
        usage: generation.usage,
        metadata: {
          retrievalTime,
          generationTime,
          totalTime,
          model: generationOptions.model || this.config.defaultModel,
          provider: provider.name,
        },
      };
    } catch (error) {
      this.logger.error('Chat request failed', error);
      throw error;
    }
  }

  async streamChat(request: ChatRequest): Promise<Observable<StreamChatResponse>> {
    const subject = new Subject<StreamChatResponse>();
    
    // Process asynchronously
    this.processStreamChat(request, subject).catch(error => {
      this.logger.error('Stream chat error', error);
      subject.next({
        id: uuidv4(),
        conversationId: request.conversationId || '',
        type: 'error',
        error: error.message,
      });
      subject.complete();
    });
    
    return subject.asObservable();
  }

  private async processStreamChat(
    request: ChatRequest,
    subject: Subject<StreamChatResponse>,
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        request.conversationId,
        request.tenantId,
        request.userId,
      );
      
      const responseId = uuidv4();
      
      subject.next({
        id: responseId,
        conversationId: conversation.id,
        type: 'start',
      });
      
      // Create user message
      await this.createMessage(
        conversation.id,
        'user',
        request.message,
        request.tenantId,
        request.userId,
        request.metadata,
      );
      
      // Get conversation context
      const context = await this.buildContext(
        conversation.id,
        request.tenantId,
        request.systemPrompt,
      );
      
      // Perform retrieval if enabled
      let retrievedDocuments: RetrievedDocument[] = [];
      
      if (request.retrievalOptions?.enabled !== false && this.config.enableRetrieval) {
        retrievedDocuments = await this.performRetrieval(
          request.message,
          request.tenantId,
          request.retrievalOptions || {},
        );
        
        if (retrievedDocuments.length > 0) {
          subject.next({
            id: responseId,
            conversationId: conversation.id,
            type: 'retrieval',
            retrievedDocuments,
          });
        }
      }
      
      // Build enhanced context
      const enhancedContext = await this.enhanceContextWithRetrieval(
        context,
        retrievedDocuments,
        request.systemPrompt,
      );
      
      // Generate streaming response
      const provider = this.getProvider(request.generationOptions?.provider);
      const generationOptions: GenerationOptions = {
        ...this.getDefaultGenerationOptions(),
        ...request.generationOptions,
        stream: true,
      };
      
      let fullContent = '';
      
      for await (const chunk of provider.generateStreamResponse(
        enhancedContext.messages,
        generationOptions,
      )) {
        if (chunk.delta) {
          fullContent += chunk.delta;
          subject.next({
            id: responseId,
            conversationId: conversation.id,
            type: 'content',
            content: chunk.delta,
          });
        }
        
        if (chunk.finishReason) {
          // Create assistant message
          await this.createMessage(
            conversation.id,
            'assistant',
            fullContent,
            request.tenantId,
            request.userId,
            {
              retrievedDocuments: retrievedDocuments.map(doc => doc.id),
              model: generationOptions.model,
              provider: provider.name,
              usage: chunk.usage,
            },
          );
          
          // Update conversation
          await this.updateConversation(conversation.id, {
            updatedAt: new Date(),
            lastMessageAt: new Date(),
            messageCount: conversation.messageCount + 2,
          });
          
          subject.next({
            id: responseId,
            conversationId: conversation.id,
            type: 'end',
            usage: chunk.usage,
            metadata: {
              totalTime: Date.now() - startTime,
              model: generationOptions.model || this.config.defaultModel,
              provider: provider.name,
            },
          });
        }
      }
      
      subject.complete();
    } catch (error) {
      throw error;
    }
  }

  private async performRetrieval(
    query: string,
    tenantId: string,
    options: RetrievalOptions,
  ): Promise<RetrievedDocument[]> {
    try {
      // Generate query embedding
      const embedding = await this.embeddingService.embed(query);
      
      // Search vector store
      const searchResults = await this.vectorStoreService.search(
        options.collections?.[0] || `tenant_${tenantId}`,
        embedding.embeddings[0],
        {
          limit: options.maxDocuments || 5,
          scoreThreshold: options.scoreThreshold || 0.7,
          tenantId,
          filter: options.filters,
          includeVectors: false,
        },
      );
      
      return searchResults.map(result => ({
        id: result.id,
        content: result.content,
        score: result.score,
        metadata: result.metadata,
        chunkId: result.id,
      }));
    } catch (error) {
      this.logger.error('Retrieval failed', error);
      return [];
    }
  }

  private async enhanceContextWithRetrieval(
    context: ChatContext,
    retrievedDocuments: RetrievedDocument[],
    systemPrompt?: string,
  ): Promise<ChatContext> {
    if (retrievedDocuments.length === 0) {
      return context;
    }
    
    // Build context from retrieved documents
    const contextText = retrievedDocuments
      .map((doc, index) => `[${index + 1}] ${doc.content}`)
      .join('\n\n');
    
    // Enhanced system prompt
    const enhancedSystemPrompt = `
${systemPrompt || 'You are a helpful AI assistant.'}

Use the following context to answer the user's question. If the context doesn't contain relevant information, say so.

## Context:
${contextText}

## Instructions:
- Answer based on the provided context
- Be specific and cite relevant information
- If the context is insufficient, acknowledge this
- Do not make up information not present in the context
    `.trim();
    
    // Replace or add system message
    const messages = [...context.messages];
    const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
    
    if (systemMessageIndex >= 0) {
      messages[systemMessageIndex] = {
        ...messages[systemMessageIndex],
        content: enhancedSystemPrompt,
      };
    } else {
      messages.unshift({
        id: uuidv4(),
        conversationId: context.conversationId,
        role: 'system',
        content: enhancedSystemPrompt,
        timestamp: new Date(),
        tenantId: messages[0]?.tenantId || '',
      });
    }
    
    return {
      ...context,
      messages,
      retrievedDocuments,
    };
  }

  private async getOrCreateConversation(
    conversationId: string | undefined,
    tenantId: string,
    userId?: string,
  ): Promise<ChatConversation> {
    if (conversationId) {
      // Try to get existing conversation
      const conversation = await this.getConversation(conversationId, tenantId);
      if (conversation) {
        return conversation;
      }
    }
    
    // Create new conversation
    return this.createConversation(tenantId, userId);
  }

  private async getConversation(
    conversationId: string,
    tenantId: string,
  ): Promise<ChatConversation | null> {
    // In a real implementation, fetch from database
    // For now, simulate
    return {
      id: conversationId,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };
  }

  private async createConversation(
    tenantId: string,
    userId?: string,
  ): Promise<ChatConversation> {
    const conversation: ChatConversation = {
      id: uuidv4(),
      tenantId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };
    
    // In a real implementation, save to database
    return conversation;
  }

  private async updateConversation(
    conversationId: string,
    updates: Partial<ChatConversation>,
  ): Promise<void> {
    // In a real implementation, update database
    this.logger.debug(`Updating conversation ${conversationId}`, updates);
  }

  private async createMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tenantId: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: uuidv4(),
      conversationId,
      role,
      content,
      metadata,
      timestamp: new Date(),
      tenantId,
      userId,
    };
    
    // In a real implementation, save to database
    return message;
  }

  private async buildContext(
    conversationId: string,
    tenantId: string,
    systemPrompt?: string,
  ): Promise<ChatContext> {
    // In a real implementation, fetch messages from database
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({
        id: uuidv4(),
        conversationId,
        role: 'system',
        content: systemPrompt,
        timestamp: new Date(),
        tenantId,
      });
    }
    
    return {
      conversationId,
      messages,
      systemPrompt,
    };
  }

  private getProvider(providerName?: string): any {
    const name = (providerName || this.config.defaultProvider) as ChatProvider_Name;
    const provider = this.providers.get(name);
    
    if (!provider) {
      throw new Error(`Chat provider ${name} not available`);
    }
    
    return provider;
  }

  private getDefaultGenerationOptions(): GenerationOptions {
    return {
      model: this.config.defaultModel,
      provider: this.config.defaultProvider,
      temperature: this.config.defaultTemperature,
      maxTokens: 2048,
    };
  }

  private loadConfig(): ChatConfig {
    return {
      defaultProvider: this.configService.get('CHAT_DEFAULT_PROVIDER', 'openai') as ChatProvider_Name,
      defaultModel: this.configService.get('CHAT_DEFAULT_MODEL', 'gpt-3.5-turbo'),
      maxContextWindow: this.configService.get('CHAT_MAX_CONTEXT_WINDOW', 4096),
      defaultTemperature: this.configService.get('CHAT_DEFAULT_TEMPERATURE', 0.7),
      maxRetries: this.configService.get('CHAT_MAX_RETRIES', 3),
      timeout: this.configService.get('CHAT_TIMEOUT', 60000),
      enableRetrieval: this.configService.get('CHAT_ENABLE_RETRIEVAL', true),
      enableStreaming: this.configService.get('CHAT_ENABLE_STREAMING', true),
      enableSafety: this.configService.get('CHAT_ENABLE_SAFETY', true),
      enableAnalytics: this.configService.get('CHAT_ENABLE_ANALYTICS', true),
      enableCaching: this.configService.get('CHAT_ENABLE_CACHING', true),
    };
  }

  private initializeProviders(): void {
    // Initialize OpenAI provider
    const openaiApiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiApiKey) {
      const openaiConfig: OpenAIConfig = {
        apiKey: openaiApiKey,
        baseURL: this.configService.get('OPENAI_BASE_URL'),
        organization: this.configService.get('OPENAI_ORGANIZATION'),
        timeout: this.configService.get('OPENAI_TIMEOUT', 60000),
      };
      this.providers.set('openai', new OpenAIProvider(openaiConfig));
    }

    // Initialize Anthropic provider
    const anthropicApiKey = this.configService.get('ANTHROPIC_API_KEY');
    if (anthropicApiKey) {
      const anthropicConfig: AnthropicConfig = {
        apiKey: anthropicApiKey,
        baseURL: this.configService.get('ANTHROPIC_BASE_URL'),
        timeout: this.configService.get('ANTHROPIC_TIMEOUT', 60000),
      };
      this.providers.set('anthropic', new AnthropicProvider(anthropicConfig));
    }

    this.logger.log(`Initialized ${this.providers.size} chat providers`);
  }
}