export interface CrawlOptions {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  respectRobotsTxt?: boolean;
  waitTime?: number;
  timeout?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  followRedirects?: boolean;
  acceptedContentTypes?: string[];
}

export interface CrawlResult {
  url: string;
  statusCode: number;
  contentType: string;
  title: string;
  content: string;
  html: string;
  links: string[];
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
    language?: string;
    [key: string]: any;
  };
  error?: string;
  crawledAt: Date;
}

export interface CrawlProgress {
  totalPages: number;
  crawledPages: number;
  failedPages: number;
  queuedPages: number;
  currentUrl?: string;
  errors: Array<{ url: string; error: string }>;
}

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}