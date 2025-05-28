import got from 'got';
import { parseStringPromise } from 'xml2js';
import { SitemapEntry } from './types';

export class SitemapParser {
  async parse(sitemapUrl: string): Promise<SitemapEntry[]> {
    try {
      const response = await got(sitemapUrl, {
        timeout: { request: 10000 },
        retry: { limit: 2 },
      });

      const xml = response.body;
      const parsed = await parseStringPromise(xml);

      // Check if it's a sitemap index
      if (parsed.sitemapindex) {
        return await this.parseSitemapIndex(parsed.sitemapindex);
      }

      // Parse regular sitemap
      if (parsed.urlset && parsed.urlset.url) {
        return this.parseUrlSet(parsed.urlset.url);
      }

      return [];
    } catch (error) {
      throw new Error(`Failed to parse sitemap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async parseSitemapIndex(sitemapindex: any): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = [];

    if (sitemapindex.sitemap) {
      for (const sitemap of sitemapindex.sitemap) {
        if (sitemap.loc && sitemap.loc[0]) {
          try {
            const subEntries = await this.parse(sitemap.loc[0]);
            entries.push(...subEntries);
          } catch {
            // Skip failed sub-sitemaps
          }
        }
      }
    }

    return entries;
  }

  private parseUrlSet(urls: any[]): SitemapEntry[] {
    const entries: SitemapEntry[] = [];

    for (const url of urls) {
      if (url.loc && url.loc[0]) {
        const entry: SitemapEntry = {
          url: url.loc[0],
        };

        if (url.lastmod && url.lastmod[0]) {
          entry.lastmod = url.lastmod[0];
        }

        if (url.changefreq && url.changefreq[0]) {
          entry.changefreq = url.changefreq[0];
        }

        if (url.priority && url.priority[0]) {
          entry.priority = parseFloat(url.priority[0]);
        }

        entries.push(entry);
      }
    }

    return entries;
  }
}