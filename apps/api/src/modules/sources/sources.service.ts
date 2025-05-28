import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { prisma, Source, SourceType } from '@chatbot-rag/database';
import { WebCrawler } from '@chatbot-rag/crawler';

@Injectable()
export class SourcesService {
  constructor(@InjectQueue('crawling') private crawlingQueue: Queue) {}

  async createWebsiteSource(projectId: string, config: any): Promise<Source> {
    const source = await prisma.source.create({
      data: {
        projectId,
        type: SourceType.website,
        name: config.name || new URL(config.url).hostname,
        config: {
          url: config.url,
          crawlDepth: config.crawlDepth || 3,
          maxPages: config.maxPages || 100,
          includePatterns: config.includePatterns || [],
          excludePatterns: config.excludePatterns || [],
        },
        metadata: {},
      },
    });

    // Queue crawling job
    await this.crawlingQueue.add('crawl-website', {
      sourceId: source.id,
      projectId,
      config: source.config,
    });

    return source;
  }

  async syncSource(sourceId: string): Promise<void> {
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error('Source not found');
    }

    switch (source.type) {
      case SourceType.website:
        await this.crawlingQueue.add('crawl-website', {
          sourceId: source.id,
          projectId: source.projectId,
          config: source.config,
        });
        break;
      case SourceType.document:
        // Handle document sync
        break;
      case SourceType.integration:
        // Handle integration sync
        break;
    }
  }
}