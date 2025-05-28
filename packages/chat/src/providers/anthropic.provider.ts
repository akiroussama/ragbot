import Anthropic from '@anthropic-ai/sdk';
import { BaseChatProvider } from './base.provider';
import { ChatMessage, GenerationOptions, TokenUsage } from '../types';

export interface AnthropicConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export class AnthropicProvider extends BaseChatProvider {
  public readonly name = 'anthropic';
  private client: Anthropic;
  private config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    super('AnthropicProvider');
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout || 60000,
    });
  }

  async generateResponse(
    messages: ChatMessage[],
    options: GenerationOptions,
  ): Promise<{
    content: string;
    usage: TokenUsage;
    finishReason: string;
  }> {
    this.validateOptions(options);
    
    return this.withRetry(async () => {
      const { system, messages: formattedMessages } = this.formatAnthropicMessages(messages);
      
      const response = await this.client.messages.create({
        model: options.model || 'claude-3-sonnet-20240229',
        messages: formattedMessages,
        system,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature,
        top_p: options.topP,
        stop_sequences: options.stop,
        stream: false,
      });
      
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('');
      
      if (!content) {
        throw new Error('No content in Anthropic response');
      }
      
      const usage: TokenUsage = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        cost: this.calculateCost(
          {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          },
          options.model || 'claude-3-sonnet-20240229',
        ),
      };
      
      return {
        content,
        usage,
        finishReason: response.stop_reason || 'end_turn',
      };
    });
  }

  async *generateStreamResponse(
    messages: ChatMessage[],
    options: GenerationOptions,
  ): AsyncGenerator<{
    content: string;
    delta?: string;
    usage?: TokenUsage;
    finishReason?: string;
  }> {
    this.validateOptions(options);
    
    const { system, messages: formattedMessages } = this.formatAnthropicMessages(messages);
    
    const stream = await this.client.messages.create({
      model: options.model || 'claude-3-sonnet-20240229',
      messages: formattedMessages,
      system,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      top_p: options.topP,
      stop_sequences: options.stop,
      stream: true,
    });
    
    let fullContent = '';
    
    try {
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = (event.delta as any).text || '';
          
          if (delta) {
            fullContent += delta;
            yield {
              content: fullContent,
              delta,
            };
          }
        }
        
        if (event.type === 'message_stop') {
          const usage: TokenUsage = {
            promptTokens: 0, // Not available in streaming
            completionTokens: 0,
            totalTokens: 0,
          };
          
          yield {
            content: fullContent,
            usage,
            finishReason: 'end_turn',
          };
        }
      }
    } catch (error) {
      this.logger.error('Anthropic streaming error', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a minimal request
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      });
      return true;
    } catch (error) {
      this.logger.error('Anthropic availability check failed', error);
      return false;
    }
  }

  private formatAnthropicMessages(messages: ChatMessage[]): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemMessage = messages.find(msg => msg.role === 'system');
    const conversationMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
    
    return {
      system: systemMessage?.content,
      messages: conversationMessages,
    };
  }

  protected calculateCost(usage: TokenUsage, model: string): number {
    const costPer1KTokens: Record<string, { prompt: number; completion: number }> = {
      'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
      'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
    };
    
    const modelCost = costPer1KTokens[model];
    if (!modelCost) return 0;
    
    const promptCost = (usage.promptTokens / 1000) * modelCost.prompt;
    const completionCost = (usage.completionTokens / 1000) * modelCost.completion;
    
    return promptCost + completionCost;
  }
}