import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { URL } from 'url';

export interface ExtractedContent {
  title: string;
  content: string;
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
    language?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    [key: string]: any;
  };
}

export class ContentExtractor {
  async extract(html: string, url: string): Promise<ExtractedContent> {
    const $ = cheerio.load(html);
    
    // Try Readability first for main content
    let mainContent = '';
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article && article.textContent) {
        mainContent = this.cleanText(article.textContent);
      }
    } catch {
      // Fallback to manual extraction
    }

    // If Readability fails, use manual extraction
    if (!mainContent) {
      mainContent = this.extractMainContent($);
    }

    // Extract metadata
    const metadata = this.extractMetadata($);

    // Extract title
    const title = this.extractTitle($, metadata);

    return {
      title,
      content: mainContent,
      metadata,
    };
  }

  private extractTitle($: cheerio.CheerioAPI, metadata: any): string {
    // Priority order for title
    const title =
      metadata.ogTitle ||
      metadata.twitterTitle ||
      $('title').text() ||
      $('h1').first().text() ||
      '';

    return this.cleanText(title);
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Remove script, style, and other non-content elements
    $('script, style, noscript, iframe, svg').remove();

    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#main',
      '#content',
      '.content',
      '.main',
      '.post',
      '.entry-content',
      '.article-content',
      '.page-content',
    ];

    let content = '';

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        if (content.length > 100) {
          break;
        }
      }
    }

    // If no main content found, extract all text
    if (!content || content.length < 100) {
      content = $('body').text();
    }

    return this.cleanText(content);
  }

  private extractMetadata($: cheerio.CheerioAPI): ExtractedContent['metadata'] {
    const metadata: ExtractedContent['metadata'] = {};

    // Standard meta tags
    metadata.description = $('meta[name="description"]').attr('content') || undefined;
    metadata.keywords = $('meta[name="keywords"]').attr('content') || undefined;
    metadata.author = $('meta[name="author"]').attr('content') || undefined;
    metadata.language = $('html').attr('lang') || $('meta[name="language"]').attr('content') || undefined;

    // Open Graph tags
    metadata.ogTitle = $('meta[property="og:title"]').attr('content') || undefined;
    metadata.ogDescription = $('meta[property="og:description"]').attr('content') || undefined;
    metadata.ogImage = $('meta[property="og:image"]').attr('content') || undefined;

    // Twitter tags
    metadata.twitterTitle = $('meta[name="twitter:title"]').attr('content') || undefined;
    metadata.twitterDescription = $('meta[name="twitter:description"]').attr('content') || undefined;

    // Dates
    metadata.publishedDate =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="publish_date"]').attr('content') ||
      $('time[datetime]').first().attr('datetime') ||
      undefined;

    metadata.modifiedDate =
      $('meta[property="article:modified_time"]').attr('content') ||
      $('meta[name="last-modified"]').attr('content') ||
      undefined;

    // Schema.org data
    const schemaScripts = $('script[type="application/ld+json"]');
    schemaScripts.each((_, element) => {
      try {
        const schemaData = JSON.parse($(element).html() || '{}');
        if (schemaData['@type'] === 'Article' || schemaData['@type'] === 'BlogPosting') {
          metadata.schemaType = schemaData['@type'];
          metadata.schemaHeadline = schemaData.headline;
          metadata.schemaDatePublished = schemaData.datePublished;
          metadata.schemaDateModified = schemaData.dateModified;
          metadata.schemaAuthor = schemaData.author?.name;
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    return metadata;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}