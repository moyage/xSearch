import * as cheerio from 'cheerio';

export interface ContentExtractionOptions {
  minTextLength?: number;
  maxTextLength?: number;
  includeImages?: boolean;
  includeLinks?: boolean;
  removeSelectors?: string[];
}

export interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  publishDate?: string;
  images: Array<{ src: string; alt: string }>;
  links: Array<{ text: string; href: string }>;
  readingTime: number;
  wordCount: number;
}

export class ContentExtractor {
  private options: Required<ContentExtractionOptions>;

  constructor(options: ContentExtractionOptions = {}) {
    this.options = {
      minTextLength: options.minTextLength || 100,
      maxTextLength: options.maxTextLength || 50000,
      includeImages: options.includeImages ?? true,
      includeLinks: options.includeLinks ?? true,
      removeSelectors: options.removeSelectors || [
        'script', 'style', 'nav', 'header', 'footer', 
        'aside', '.advertisement', '.ads', '.social-share',
        '.comments', '.related-posts', 'iframe',
      ],
    };
  }

  extract(html: string, url: string): ExtractedContent {
    const $ = cheerio.load(html);

    // 移除无用元素
    this.options.removeSelectors.forEach(selector => {
      $(selector).remove();
    });

    // 提取标题
    const title = this.extractTitle($);

    // 提取主要内容
    const content = this.extractMainContent($);

    // 提取元数据
    const metadata = this.extractMetadata($);

    // 提取图片
    const images = this.options.includeImages ? this.extractImages($, url) : [];

    // 提取链接
    const links = this.options.includeLinks ? this.extractLinks($, url) : [];

    // 计算阅读时间和字数
    const wordCount = this.countWords(content);
    const readingTime = Math.ceil(wordCount / 200); // 假设每分钟200字

    // 生成摘要
    const excerpt = this.generateExcerpt(content, 200);

    return {
      title,
      content: content.substring(0, this.options.maxTextLength),
      excerpt,
      author: metadata.author,
      publishDate: metadata.publishDate,
      images,
      links,
      readingTime,
      wordCount,
    };
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // 尝试多种方式提取标题
    const selectors = [
      'h1.article-title',
      'h1.entry-title',
      'h1.post-title',
      'article h1',
      'main h1',
      'h1',
    ];

    for (const selector of selectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 5) {
        return title;
      }
    }

    return $('title').text().trim() || 'Untitled';
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.entry-content',
      '.post-content',
      '.content',
      '#content',
      '.main',
    ];

    let bestContent = '';
    let bestScore = 0;

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        const score = this.calculateContentScore(text, element);
        
        if (score > bestScore && text.length > this.options.minTextLength) {
          bestScore = score;
          bestContent = text;
        }
      }
    }

    // 如果没找到，使用body内容
    if (!bestContent) {
      bestContent = $('body').text().trim();
    }

    return this.cleanText(bestContent);
  }

  private calculateContentScore(text: string, element: cheerio.Cheerio<any>): number {
    const textLength = text.length;
    const paragraphCount = element.find('p').length;
    const linkDensity = element.find('a').length / (textLength / 100 + 1);
    
    return textLength * 0.5 + paragraphCount * 10 - linkDensity * 5;
  }

  private extractMetadata($: cheerio.CheerioAPI): { author?: string; publishDate?: string } {
    const author = 
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('.author').first().text().trim() ||
      undefined;

    const publishDate = 
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="publish-date"]').attr('content') ||
      $('time[datetime]').first().attr('datetime') ||
      undefined;

    return { author, publishDate };
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): Array<{ src: string; alt: string }> {
    const images: Array<{ src: string; alt: string }> = [];
    
    $('img').each((_, elem) => {
      const $img = $(elem);
      let src = $img.attr('src') || $img.attr('data-src');
      const alt = $img.attr('alt') || '';
      
      if (src) {
        // 处理相对URL
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (src.startsWith('/')) {
          const url = new URL(baseUrl);
          src = url.origin + src;
        }
        
        images.push({ src, alt });
      }
    });

    return images.slice(0, 20); // 限制数量
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): Array<{ text: string; href: string }> {
    const links: Array<{ text: string; href: string }> = [];
    const seen = new Set<string>();
    
    $('a[href]').each((_, elem) => {
      const $a = $(elem);
      const href = $a.attr('href');
      const text = $a.text().trim();
      
      if (href && text && !seen.has(href) && text.length > 3) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          if (absoluteUrl.startsWith('http')) {
            links.push({ text: text.substring(0, 100), href: absoluteUrl });
            seen.add(href);
          }
        } catch {
          // 忽略无效URL
        }
      }
    });

    return links.slice(0, 30); // 限制数量
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  private generateExcerpt(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // 找到合适的截断点（句子结尾）
    const truncated = text.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }
}

// 导出辅助函数
export function extractContent(html: string, url: string, options?: ContentExtractionOptions): ExtractedContent {
  const extractor = new ContentExtractor(options);
  return extractor.extract(html, url);
}
