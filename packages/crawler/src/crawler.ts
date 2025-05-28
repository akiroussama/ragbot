import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { chromium as chromiumExtra } from 'playwright-extra';
import StealthPlugin from 'playwright-extra-plugin-stealth';
import PQueue from 'p-queue';
import { URL } from 'url';
import { CrawlOptions, CrawlResult, CrawlProgress } from './types';
import { RobotsParser } from './robots-parser';
import { SitemapParser } from './sitemap-parser';
import { ContentExtractor } from './content-extractor';

chromiumExtra.use(StealthPlugin());

export class WebCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private queue: PQueue;
  private visited: Set<string> = new Set();
  private results: Map<string, CrawlResult> = new Map();
  private robotsParser: RobotsParser;
  private sitemapParser: SitemapParser;
  private contentExtractor: ContentExtractor;
  private options: Required<CrawlOptions>;
  private progress: CrawlProgress = {
    totalPages: 0,
    crawledPages: 0,
    failedPages: 0,
    queuedPages: 0,
    errors: [],
  };

  constructor(options: CrawlOptions) {
    this.options = {
      maxDepth: 3,
      maxPages: 100,
      includePatterns: [],
      excludePatterns: [],
      respectRobotsTxt: true,
      waitTime: 1000,
      timeout: 30000,
      userAgent: 'ChatbotRAG/1.0 (compatible; WebCrawler/1.0)',
      headers: {},
      followRedirects: true,
      acceptedContentTypes: ['text/html', 'application/xhtml+xml'],
      ...options,
    };

    this.queue = new PQueue({ concurrency: 5 });
    this.robotsParser = new RobotsParser(this.options.userAgent);
    this.sitemapParser = new SitemapParser();
    this.contentExtractor = new ContentExtractor();
  }

  async crawl(onProgress?: (progress: CrawlProgress) => void): Promise<CrawlResult[]> {
    try {
      await this.initialize();

      // Check robots.txt
      if (this.options.respectRobotsTxt) {
        const robotsUrl = new URL('/robots.txt', this.options.url).href;
        await this.robotsParser.parse(robotsUrl);
      }

      // Try to parse sitemap first
      const sitemapUrls = await this.tryParseSitemap();
      if (sitemapUrls.length > 0) {
        for (const url of sitemapUrls) {
          if (this.shouldCrawl(url) && !this.visited.has(url)) {
            this.queue.add(() => this.crawlPage(url, 0, onProgress));
          }
        }
      } else {
        // Start with the initial URL
        this.queue.add(() => this.crawlPage(this.options.url, 0, onProgress));
      }

      await this.queue.onIdle();
      return Array.from(this.results.values());
    } finally {
      await this.cleanup();
    }
  }

  private async initialize() {
    const useStealthMode = process.env.NODE_ENV === 'production';
    const browserToUse = useStealthMode ? chromiumExtra : chromium;

    this.browser = await browserToUse.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
      ],
    });

    this.context = await this.browser.newContext({
      userAgent: this.options.userAgent,
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: this.options.headers,
    });
  }

  private async cleanup() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async crawlPage(
    url: string,
    depth: number,
    onProgress?: (progress: CrawlProgress) => void,
  ): Promise<void> {
    if (
      this.visited.has(url) ||
      depth > this.options.maxDepth ||
      this.visited.size >= this.options.maxPages
    ) {
      return;
    }

    this.visited.add(url);
    this.progress.currentUrl = url;
    this.progress.totalPages = this.visited.size + this.queue.size;
    this.progress.queuedPages = this.queue.size;

    let page: Page | null = null;

    try {
      page = await this.context!.newPage();
      
      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout,
      });

      if (!response) {
        throw new Error('No response received');
      }

      const statusCode = response.status();
      const contentType = response.headers()['content-type'] || '';

      // Check if content type is acceptable
      const isAcceptable = this.options.acceptedContentTypes.some((type) =>
        contentType.toLowerCase().includes(type.toLowerCase()),
      );

      if (!isAcceptable) {
        throw new Error(`Unacceptable content type: ${contentType}`);
      }

      // Wait a bit to ensure page is fully loaded
      await page.waitForTimeout(this.options.waitTime);

      // Extract content
      const html = await page.content();
      const extractedContent = await this.contentExtractor.extract(html, url);

      // Find all links on the page
      const links = await this.extractLinks(page, url);

      const result: CrawlResult = {
        url,
        statusCode,
        contentType,
        title: extractedContent.title,
        content: extractedContent.content,
        html,
        links,
        metadata: extractedContent.metadata,
        crawledAt: new Date(),
      };

      this.results.set(url, result);
      this.progress.crawledPages++;

      // Add links to queue
      for (const link of links) {
        if (
          this.shouldCrawl(link) &&
          !this.visited.has(link) &&
          this.visited.size < this.options.maxPages
        ) {
          this.queue.add(() => this.crawlPage(link, depth + 1, onProgress));
        }
      }
    } catch (error) {
      this.progress.failedPages++;
      this.progress.errors.push({
        url,
        error: error instanceof Error ? error.message : String(error),
      });

      this.results.set(url, {
        url,
        statusCode: 0,
        contentType: '',
        title: '',
        content: '',
        html: '',
        links: [],
        metadata: {},
        error: error instanceof Error ? error.message : String(error),
        crawledAt: new Date(),
      });
    } finally {
      if (page) {
        await page.close();
      }

      if (onProgress) {
        onProgress({ ...this.progress });
      }
    }
  }

  private async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]');
      return Array.from(anchors).map((a) => a.getAttribute('href')!);
    });

    const absoluteLinks: string[] = [];
    const base = new URL(baseUrl);

    for (const link of links) {
      try {
        const absoluteUrl = new URL(link, baseUrl).href;
        
        // Only include links from the same domain
        const linkUrl = new URL(absoluteUrl);
        if (linkUrl.hostname === base.hostname) {
          absoluteLinks.push(absoluteUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }

    return [...new Set(absoluteLinks)];
  }

  private shouldCrawl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const baseUrl = new URL(this.options.url);

      // Check if same domain
      if (urlObj.hostname !== baseUrl.hostname) {
        return false;
      }

      // Check robots.txt
      if (this.options.respectRobotsTxt && !this.robotsParser.isAllowed(url)) {
        return false;
      }

      // Check include patterns
      if (this.options.includePatterns.length > 0) {
        const included = this.options.includePatterns.some((pattern) =>
          new RegExp(pattern).test(url),
        );
        if (!included) return false;
      }

      // Check exclude patterns
      if (this.options.excludePatterns.length > 0) {
        const excluded = this.options.excludePatterns.some((pattern) =>
          new RegExp(pattern).test(url),
        );
        if (excluded) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async tryParseSitemap(): Promise<string[]> {
    try {
      const sitemapUrls = [
        new URL('/sitemap.xml', this.options.url).href,
        new URL('/sitemap_index.xml', this.options.url).href,
        new URL('/sitemap-index.xml', this.options.url).href,
      ];

      for (const sitemapUrl of sitemapUrls) {
        try {
          const entries = await this.sitemapParser.parse(sitemapUrl);
          if (entries.length > 0) {
            return entries.map((entry) => entry.url);
          }
        } catch {
          // Try next sitemap URL
        }
      }

      // Check robots.txt for sitemap
      if (this.robotsParser.sitemapUrls.length > 0) {
        for (const sitemapUrl of this.robotsParser.sitemapUrls) {
          try {
            const entries = await this.sitemapParser.parse(sitemapUrl);
            if (entries.length > 0) {
              return entries.map((entry) => entry.url);
            }
          } catch {
            // Try next sitemap URL
          }
        }
      }
    } catch {
      // No sitemap found
    }

    return [];
  }
}