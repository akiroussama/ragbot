import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobProgress, JobResult } from '../types';

export abstract class BaseProcessor<TData = any, TResult = any> {
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  abstract process(job: Job<TData>): Promise<TResult>;

  protected async updateProgress(
    job: Job<TData>,
    progress: JobProgress,
  ): Promise<void> {
    try {
      await job.progress(progress);
      this.logger.debug(
        `Job ${job.id} progress: ${progress.current}/${progress.total} - ${progress.message}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to update job progress for job ${job.id}`, error);
    }
  }

  protected createSuccessResult(data?: any, metadata?: Record<string, any>): JobResult {
    return {
      success: true,
      data,
      metadata,
    };
  }

  protected createErrorResult(
    error: string | Error,
    data?: any,
    metadata?: Record<string, any>,
  ): JobResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : error,
      data,
      metadata,
    };
  }

  protected async executeWithErrorHandling<T>(
    job: Job<TData>,
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.logger.debug(
        `${context} completed for job ${job.id} in ${duration}ms`,
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        `${context} failed for job ${job.id}: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  protected validateJobData(job: Job<TData>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!job.data || !(field in job.data) || job.data[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  protected getTenantId(job: Job<TData>): string {
    const tenantId = (job.data as any)?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return tenantId;
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        this.logger.warn(
          `Operation failed (attempt ${attempt}/${maxAttempts}): ${error.message}. Retrying in ${delay}ms...`,
        );
        
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError!;
  }
}