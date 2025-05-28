import { Logger } from '@nestjs/common';
import { ChatProvider, ChatMessage, GenerationOptions, TokenUsage } from '../types';

export abstract class BaseChatProvider implements ChatProvider {
  protected readonly logger: Logger;
  public abstract readonly name: string;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  abstract generateResponse(
    messages: ChatMessage[],
    options: GenerationOptions,
  ): Promise<{
    content: string;
    usage: TokenUsage;
    finishReason: string;
  }>;

  abstract generateStreamResponse(
    messages: ChatMessage[],
    options: GenerationOptions,
  ): AsyncGenerator<{
    content: string;
    delta?: string;
    usage?: TokenUsage;
    finishReason?: string;
  }>;

  abstract isAvailable(): Promise<boolean>;

  protected formatMessages(messages: ChatMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system' || msg.content.trim())
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
  }

  protected extractSystemPrompt(messages: ChatMessage[]): string | undefined {
    const systemMessage = messages.find(msg => msg.role === 'system');
    return systemMessage?.content;
  }

  protected validateOptions(options: GenerationOptions): void {
    if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }
    
    if (options.maxTokens !== undefined && options.maxTokens <= 0) {
      throw new Error('Max tokens must be positive');
    }
    
    if (options.topP !== undefined && (options.topP < 0 || options.topP > 1)) {
      throw new Error('Top P must be between 0 and 1');
    }
  }

  protected calculateCost(usage: TokenUsage, model: string): number {
    // Default cost calculation - override in specific providers
    const costPer1KTokens = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
      'claude-3-opus': { prompt: 0.015, completion: 0.075 },
      'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
    };
    
    const modelCost = costPer1KTokens[model as keyof typeof costPer1KTokens];
    if (!modelCost) return 0;
    
    const promptCost = (usage.promptTokens / 1000) * modelCost.prompt;
    const completionCost = (usage.completionTokens / 1000) * modelCost.completion;
    
    return promptCost + completionCost;
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(
          `${this.name} request failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${delay}ms...`,
        );
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}