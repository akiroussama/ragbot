import OpenAI from 'openai';
import { BaseChatProvider } from './base.provider';
import { ChatMessage, GenerationOptions, TokenUsage } from '../types';

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  timeout?: number;
}

export class OpenAIProvider extends BaseChatProvider {
  public readonly name = 'openai';
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super('OpenAIProvider');
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
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
      const formattedMessages = this.formatMessages(messages);
      const systemPrompt = this.extractSystemPrompt(messages);
      
      if (systemPrompt && !formattedMessages.some(m => m.role === 'system')) {
        formattedMessages.unshift({ role: 'system', content: systemPrompt });
      }
      
      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: formattedMessages as any,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stop,
        stream: false,
      });
      
      const choice = response.choices[0];
      if (!choice.message?.content) {
        throw new Error('No content in OpenAI response');
      }
      
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        cost: this.calculateCost(
          {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          options.model || 'gpt-3.5-turbo',
        ),
      };
      
      return {
        content: choice.message.content,
        usage,
        finishReason: choice.finish_reason || 'stop',
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
    
    const formattedMessages = this.formatMessages(messages);
    const systemPrompt = this.extractSystemPrompt(messages);
    
    if (systemPrompt && !formattedMessages.some(m => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: systemPrompt });
    }
    
    const stream = await this.client.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages: formattedMessages as any,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: true,
    });
    
    let fullContent = '';
    
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        
        if (delta) {
          fullContent += delta;
          yield {
            content: fullContent,
            delta,
          };
        }
        
        if (chunk.choices[0]?.finish_reason) {
          const usage: TokenUsage = {
            promptTokens: 0, // Not available in streaming
            completionTokens: 0,
            totalTokens: 0,
          };
          
          yield {
            content: fullContent,
            usage,
            finishReason: chunk.choices[0].finish_reason,
          };
        }
      }
    } catch (error) {
      this.logger.error('OpenAI streaming error', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      this.logger.error('OpenAI availability check failed', error);
      return false;
    }
  }

  protected calculateCost(usage: TokenUsage, model: string): number {
    const costPer1KTokens: Record<string, { prompt: number; completion: number }> = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
      'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },
    };
    
    const modelCost = costPer1KTokens[model];
    if (!modelCost) return 0;
    
    const promptCost = (usage.promptTokens / 1000) * modelCost.prompt;
    const completionCost = (usage.completionTokens / 1000) * modelCost.completion;
    
    return promptCost + completionCost;
  }
}