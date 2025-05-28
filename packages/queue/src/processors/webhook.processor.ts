import { Process, Processor } from '@nestjs/bull';
import { Injectable, HttpService } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import {
  WebhookJobData,
  WebhookJobResult,
  QUEUE_NAMES,
} from '../types';
import axios, { AxiosResponse, AxiosError } from 'axios';

@Injectable()
@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhookProcessor extends BaseProcessor<
  WebhookJobData,
  WebhookJobResult
> {
  constructor() {
    super('WebhookProcessor');
  }

  @Process('send-webhook')
  async process(job: Job<WebhookJobData>): Promise<WebhookJobResult> {
    return this.executeWithErrorHandling(
      job,
      async () => {
        this.validateJobData(job, ['url', 'method', 'tenantId', 'eventType', 'eventId']);
        
        const {
          url,
          method,
          headers = {},
          payload,
          tenantId,
          eventType,
          eventId,
          retryAttempts = 3,
        } = job.data;
        
        await this.updateProgress(job, {
          current: 0,
          total: 100,
          message: 'Preparing webhook request',
        });

        const startTime = Date.now();
        
        try {
          await this.updateProgress(job, {
            current: 25,
            total: 100,
            message: 'Sending webhook request',
          });
          
          const response = await this.sendWebhook(
            url,
            method,
            payload,
            headers,
            retryAttempts,
          );
          
          const responseTime = Date.now() - startTime;
          
          await this.updateProgress(job, {
            current: 75,
            total: 100,
            message: 'Processing webhook response',
          });
          
          // Log successful webhook
          await this.logWebhookAttempt(
            tenantId,
            eventType,
            eventId,
            url,
            method,
            response.status,
            responseTime,
            true,
          );
          
          await this.updateProgress(job, {
            current: 100,
            total: 100,
            message: 'Webhook sent successfully',
          });

          return this.createSuccessResult(
            {
              statusCode: response.status,
              responseTime,
              responseBody: response.data,
            },
            {
              tenantId,
              eventType,
              eventId,
              url,
              method,
              attempt: job.attemptsMade + 1,
            },
          );
        } catch (error) {
          const responseTime = Date.now() - startTime;
          const axiosError = error as AxiosError;
          
          // Log failed webhook
          await this.logWebhookAttempt(
            tenantId,
            eventType,
            eventId,
            url,
            method,
            axiosError.response?.status,
            responseTime,
            false,
            axiosError.message,
          );
          
          throw error;
        }
      },
      'Webhook delivery',
    );
  }

  private async sendWebhook(
    url: string,
    method: string,
    payload?: any,
    headers: Record<string, string> = {},
    maxRetries: number = 3,
  ): Promise<AxiosResponse> {
    const requestConfig = {
      method: method.toLowerCase() as any,
      url,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ChatbotRAG-Webhook/1.0',
        ...headers,
      },
      data: payload,
      timeout: 30000, // 30 seconds
      validateStatus: (status: number) => status >= 200 && status < 300,
    };

    return this.withRetry(
      async () => {
        this.logger.debug(
          `Sending ${method} webhook to ${url}`,
        );
        
        const response = await axios(requestConfig);
        
        this.logger.debug(
          `Webhook response: ${response.status} ${response.statusText}`,
        );
        
        return response;
      },
      maxRetries,
      1000, // 1 second base delay
    );
  }

  private async logWebhookAttempt(
    tenantId: string,
    eventType: string,
    eventId: string,
    url: string,
    method: string,
    statusCode?: number,
    responseTime?: number,
    success: boolean = false,
    error?: string,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Logging webhook attempt: ${eventType}:${eventId} -> ${url} (${statusCode}) [${success ? 'SUCCESS' : 'FAILED'}]`,
      );
      
      // In a real implementation, save to webhook_logs table
      // const logEntry = {
      //   tenantId,
      //   eventType,
      //   eventId,
      //   url,
      //   method,
      //   statusCode,
      //   responseTime,
      //   success,
      //   error,
      //   timestamp: new Date(),
      // };
      // 
      // await this.webhookLogRepository.save(logEntry);
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (logError) {
      this.logger.error(
        `Failed to log webhook attempt: ${logError.message}`,
        logError,
      );
      // Don't throw here - webhook logging failure shouldn't fail the webhook
    }
  }

  // Webhook retry logic with exponential backoff
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;
        
        // Don't retry on client errors (4xx) except for specific cases
        if (axiosError.response) {
          const status = axiosError.response.status;
          if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
            this.logger.warn(
              `Not retrying webhook due to client error: ${status}`,
            );
            throw error;
          }
        }
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        
        this.logger.warn(
          `Webhook attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`,
        );
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}