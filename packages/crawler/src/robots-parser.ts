import robotsParser from 'robots-parser';
import got from 'got';

export class RobotsParser {
  private parser: any = null;
  private userAgent: string;
  public sitemapUrls: string[] = [];

  constructor(userAgent: string) {
    this.userAgent = userAgent;
  }

  async parse(robotsUrl: string): Promise<void> {
    try {
      const response = await got(robotsUrl, {
        timeout: { request: 5000 },
        retry: { limit: 1 },
      });

      const robotsTxt = response.body;
      this.parser = robotsParser(robotsUrl, robotsTxt);

      // Extract sitemap URLs
      const lines = robotsTxt.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim().toLowerCase();
        if (trimmedLine.startsWith('sitemap:')) {
          const sitemapUrl = line.substring(8).trim();
          if (sitemapUrl) {
            this.sitemapUrls.push(sitemapUrl);
          }
        }
      }
    } catch (error) {
      // If robots.txt doesn't exist or can't be fetched, allow all
      this.parser = null;
    }
  }

  isAllowed(url: string): boolean {
    if (!this.parser) {
      return true; // No robots.txt means everything is allowed
    }

    return this.parser.isAllowed(url, this.userAgent) ?? true;
  }

  getCrawlDelay(): number {
    if (!this.parser) {
      return 0;
    }

    return this.parser.getCrawlDelay(this.userAgent) ?? 0;
  }
}