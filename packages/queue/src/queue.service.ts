import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobOptions as BullJobOptions } from 'bull';
import {
  JobOptions,
  JobResult,
  QueueStats,
  QueueHealth,
  QueueName,
  QUEUE_NAMES,
  AnyJobData,
} from './types';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<QueueName, Queue> = new Map();

  constructor(
    @InjectQueue(QUEUE_NAMES.DOCUMENT_PROCESSING)
    private readonly documentProcessingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMBEDDING_GENERATION)
    private readonly embeddingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.VECTOR_SYNC)
    private readonly vectorSyncQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOKS)
    private readonly webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CLEANUP)
    private readonly cleanupQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EXPORT)
    private readonly exportQueue: Queue,
  ) {
    this.queues.set(QUEUE_NAMES.DOCUMENT_PROCESSING, this.documentProcessingQueue);
    this.queues.set(QUEUE_NAMES.EMBEDDING_GENERATION, this.embeddingQueue);
    this.queues.set(QUEUE_NAMES.VECTOR_SYNC, this.vectorSyncQueue);
    this.queues.set(QUEUE_NAMES.WEBHOOKS, this.webhookQueue);
    this.queues.set(QUEUE_NAMES.CLEANUP, this.cleanupQueue);
    this.queues.set(QUEUE_NAMES.EXPORT, this.exportQueue);
  }

  async onModuleDestroy(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }

  async addJob<T extends AnyJobData>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options: JobOptions = {},
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    
    const bullOptions: BullJobOptions = {
      priority: options.priority,
      delay: options.delay,
      attempts: options.attempts || 3,
      backoff: options.backoff,
      removeOnComplete: options.removeOnComplete ?? 10,
      removeOnFail: options.removeOnFail ?? 50,
      jobId: options.jobId,
      timeout: options.timeout,
    };

    try {
      const job = await queue.add(jobName, data, bullOptions);
      
      this.logger.debug(
        `Added job ${job.id} to queue ${queueName} with name ${jobName}`,
      );
      
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add job to queue ${queueName}: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  async getJob(queueName: QueueName, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  async removeJob(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      this.logger.debug(`Removed job ${jobId} from queue ${queueName}`);
    }
  }

  async retryJob(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.retry();
      this.logger.debug(`Retried job ${jobId} in queue ${queueName}`);
    }
  }

  async getJobsByState(
    queueName: QueueName,
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    start = 0,
    end = -1,
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    
    switch (state) {
      case 'waiting':
        return queue.getWaiting(start, end);
      case 'active':
        return queue.getActive(start, end);
      case 'completed':
        return queue.getCompleted(start, end);
      case 'failed':
        return queue.getFailed(start, end);
      case 'delayed':
        return queue.getDelayed(start, end);
      default:
        throw new Error(`Unknown job state: ${state}`);
    }
  }

  async getQueueStats(queueName: QueueName): Promise<QueueStats> {
    const queue = this.getQueue(queueName);
    
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaiting().then((jobs) => jobs.length),
      queue.getActive().then((jobs) => jobs.length),
      queue.getCompleted().then((jobs) => jobs.length),
      queue.getFailed().then((jobs) => jobs.length),
      queue.getDelayed().then((jobs) => jobs.length),
      queue.isPaused().then((isPaused) => (isPaused ? 1 : 0)),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  async getAllStats(): Promise<Record<QueueName, QueueStats>> {
    const stats: Record<string, QueueStats> = {};
    
    for (const [queueName] of this.queues) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    
    return stats as Record<QueueName, QueueStats>;
  }

  async getQueueHealth(queueName: QueueName): Promise<QueueHealth> {
    try {
      const queue = this.getQueue(queueName);
      const stats = await this.getQueueStats(queueName);
      
      // Check if queue is responsive
      const isHealthy = await this.isQueueHealthy(queue);
      
      // Get recent failed jobs for error analysis
      const failedJobs = await queue.getFailed(0, 4);
      const errors = failedJobs.map((job) => job.failedReason || 'Unknown error');
      
      // Get last processed job
      const completedJobs = await queue.getCompleted(0, 0);
      const lastProcessed = completedJobs[0]?.processedOn
        ? new Date(completedJobs[0].processedOn)
        : undefined;

      return {
        isHealthy,
        stats,
        lastProcessed,
        errors,
      };
    } catch (error) {
      this.logger.error(`Failed to get health for queue ${queueName}`, error);
      
      return {
        isHealthy: false,
        stats: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
        },
        errors: [error.message],
      };
    }
  }

  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Paused queue ${queueName}`);
  }

  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Resumed queue ${queueName}`);
  }

  async cleanQueue(
    queueName: QueueName,
    grace: number = 0,
    status?: 'completed' | 'failed',
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    
    if (status) {
      await queue.clean(grace, status);
    } else {
      await Promise.all([
        queue.clean(grace, 'completed'),
        queue.clean(grace, 'failed'),
      ]);
    }
    
    this.logger.log(`Cleaned queue ${queueName} (grace: ${grace}ms, status: ${status || 'all'})`);
  }

  async drainQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.drain();
    this.logger.log(`Drained queue ${queueName}`);
  }

  getQueueNames(): QueueName[] {
    return Array.from(this.queues.keys());
  }

  // Job creation helper methods
  async addDocumentProcessingJob(
    data: import('./types').DocumentProcessingJobData,
    options?: JobOptions,
  ) {
    return this.addJob(QUEUE_NAMES.DOCUMENT_PROCESSING, 'process-document', data, options);
  }

  async addEmbeddingJob(
    data: import('./types').EmbeddingJobData,
    options?: JobOptions,
  ) {
    return this.addJob(QUEUE_NAMES.EMBEDDING_GENERATION, 'generate-embeddings', data, options);
  }

  async addVectorSyncJob(
    data: import('./types').VectorSyncJobData,
    options?: JobOptions,
  ) {
    return this.addJob(QUEUE_NAMES.VECTOR_SYNC, 'sync-vectors', data, options);
  }

  async addWebhookJob(
    data: import('./types').WebhookJobData,
    options?: JobOptions,
  ) {
    return this.addJob(QUEUE_NAMES.WEBHOOKS, 'send-webhook', data, options);
  }

  async addCleanupJob(
    data: import('./types').CleanupJobData,
    options?: JobOptions,
  ) {
    return this.addJob(QUEUE_NAMES.CLEANUP, 'cleanup-data', data, options);
  }

  async addExportJob(
    data: import('./types').ExportJobData,
    options?: JobOptions,
  ) {
    return this.addJob(QUEUE_NAMES.EXPORT, 'export-data', data, options);
  }

  private getQueue(queueName: QueueName): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue;
  }

  private async isQueueHealthy(queue: Queue): Promise<boolean> {
    try {
      // Simple health check - try to get queue stats
      await queue.getWaiting(0, 0);
      return true;
    } catch (error) {
      this.logger.error('Queue health check failed', error);
      return false;
    }
  }
}