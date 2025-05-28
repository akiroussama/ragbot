import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { prisma, JobStatus } from '@chatbot-rag/database';
import { WebCrawler, CrawlResult } from '@chatbot-rag/crawler';
import { LoggerService } from '../../common/logger/logger.service';

@Processor('crawling')
@Injectable()
export class CrawlingProcessor {
  constructor(private logger: LoggerService) {
    this.logger.setContext('CrawlingProcessor');
  }

  @Process('crawl-website')
  async handleWebsiteCrawl(job: Job<{
    sourceId: string;
    projectId: string;
    config: any;
  }>) {
    const { sourceId, projectId, config } = job.data;

    this.logger.log(`Starting website crawl for source ${sourceId}`);

    // Create job record
    const crawlJob = await prisma.job.create({
      data: {
        projectId,
        type: 'website_crawl',
        status: JobStatus.processing,
        config: {
          sourceId,
          ...config,
        },
      },
    });

    try {
      // Update job start time
      await prisma.job.update({
        where: { id: crawlJob.id },
        data: {
          startedAt: new Date(),
        },
      });

      // Initialize crawler
      const crawler = new WebCrawler({
        url: config.url,
        maxDepth: config.crawlDepth || 3,
        maxPages: config.maxPages || 100,
        includePatterns: config.includePatterns || [],
        excludePatterns: config.excludePatterns || [],
        respectRobotsTxt: true,
        waitTime: 1000,
        timeout: 30000,
      });

      // Start crawling
      const results = await crawler.crawl((progress) => {
        // Update job progress
        job.progress(Math.round((progress.crawledPages / progress.totalPages) * 100));
      });

      // Process results
      await this.processCrawlResults(sourceId, results);

      // Update source last synced
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          lastSyncedAt: new Date(),
          metadata: {
            lastCrawl: {
              pagesFound: results.length,
              successfulPages: results.filter(r => !r.error).length,
              failedPages: results.filter(r => r.error).length,
            },
          },
        },
      });

      // Mark job as completed
      await prisma.job.update({
        where: { id: crawlJob.id },
        data: {
          status: JobStatus.completed,
          completedAt: new Date(),
          result: {
            pagesProcessed: results.length,
            successCount: results.filter(r => !r.error).length,
            errorCount: results.filter(r => r.error).length,
          },
        },
      });

      this.logger.log(`Completed website crawl for source ${sourceId}`);
    } catch (error) {
      this.logger.error(`Failed to crawl website for source ${sourceId}`, error);

      // Mark job as failed
      await prisma.job.update({
        where: { id: crawlJob.id },
        data: {
          status: JobStatus.failed,
          completedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  private async processCrawlResults(sourceId: string, results: CrawlResult[]) {
    // Delete existing documents for this source
    await prisma.document.deleteMany({
      where: { sourceId },
    });

    // Create new documents
    for (const result of results) {
      if (!result.error && result.content) {
        await prisma.document.create({
          data: {
            sourceId,
            title: result.title || result.url,
            content: result.content,
            url: result.url,
            metadata: {
              ...result.metadata,
              contentType: result.contentType,
              statusCode: result.statusCode,
              crawledAt: result.crawledAt,
            },
          },
        });
      }
    }
  }
}