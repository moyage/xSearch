import { EventEmitter } from 'events';
import * as cheerio from 'cheerio';

export interface WaterfallOptions {
  maxScrolls?: number;
  waitTime?: number;
  scrollDelay?: { min: number; max: number };
  extractSelector: string;
  stopWhenNoNewContent?: boolean;
  checkpointInterval?: number;
}

export interface ScrollMetrics {
  scrollCount: number;
  totalHeight: number;
  itemsFound: number;
  newItemsInLastScroll: number;
  timeElapsed: number;
}

export class WaterfallCrawler extends EventEmitter {
  private metrics: ScrollMetrics;
  private checkpoint: any = null;
  private htmlContent: string = '';

  constructor() {
    super();
    this.metrics = {
      scrollCount: 0,
      totalHeight: 0,
      itemsFound: 0,
      newItemsInLastScroll: 0,
      timeElapsed: 0,
    };
  }

  async initialize(): Promise<void> {
    this.emit('browser:launched');
  }

  async crawl(url: string, options: WaterfallOptions): Promise<any[]> {
    await this.fetchPage(url);
    const startTime = Date.now();
    const allItems = new Map();
    
    const maxScrolls = options.maxScrolls || 100;
    const waitTime = options.waitTime || 2000;
    
    let previousHeight = 0;
    let noNewContentCount = 0;
    const checkpointInterval = options.checkpointInterval || 10;

    for (let i = 0; i < maxScrolls; i++) {
      this.metrics.scrollCount = i + 1;
      const items = this.extractItems(options.extractSelector);
      const previousCount = allItems.size;

      for (const item of items) {
        const key = this.getItemKey(item);
        if (!allItems.has(key)) {
          allItems.set(key, item);
        }
      }

      this.metrics.itemsFound = allItems.size;
      this.metrics.newItemsInLastScroll = allItems.size - previousCount;

      this.emit('scroll:completed', {
        scrollNumber: i + 1,
        itemsFound: allItems.size,
        newItems: this.metrics.newItemsInLastScroll,
      });

      if (options.stopWhenNoNewContent && this.metrics.newItemsInLastScroll === 0) {
        noNewContentCount++;
        if (noNewContentCount >= 3) {
          this.emit('crawl:stopped', { reason: 'no_new_content' });
          break;
        }
      } else {
        noNewContentCount = 0;
      }

      if ((i + 1) % checkpointInterval === 0) {
        this.checkpoint = { url, itemsCount: allItems.size, lastItem: Array.from(allItems.values())[allItems.size - 1], timestamp: new Date().toISOString() };
        this.emit('checkpoint:saved', { scrollNumber: i + 1, itemsCount: allItems.size });
      }

      await this.smartScroll(options.scrollDelay);
      this.metrics.totalHeight = this.estimatePageHeight();

      await this.delay(waitTime);

      if (this.metrics.totalHeight === previousHeight) {
        this.emit('crawl:stopped', { reason: 'reached_bottom' });
        break;
      }

      previousHeight = this.metrics.totalHeight;
    }

    this.metrics.timeElapsed = Date.now() - startTime;
    
    this.emit('crawl:completed', {
      totalItems: allItems.size,
      scrolls: this.metrics.scrollCount,
      timeElapsed: this.metrics.timeElapsed,
    });

    return Array.from(allItems.values());
  }

  private async fetchPage(url: string): Promise<void> {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });
    this.htmlContent = await response.text();
  }

  private extractItems(selector: string): any[] {
    const $ = cheerio.load(this.htmlContent);
    const elements = $(selector);
    const items: any[] = [];
    
    elements.each((index, el) => {
      const text = $(el).text();
      const link = $(el).find('a').first();
      const href = link.attr('href') || '';
      const titleEl = $(el).find('h1, h2, h3, h4, .title').first();
      const title = titleEl.text() || text.substring(0, 100);
      
      items.push({
        index,
        title: title.trim(),
        text: text.trim().substring(0, 500),
        href,
        html: $(el).html()?.substring(0, 1000) || '',
      });
    });
    
    return items;
  }

  private async smartScroll(delayRange?: { min: number; max: number }): Promise<void> {
    const minDelay = delayRange?.min || 500;
    const maxDelay = delayRange?.max || 1500;
    const scrollSteps = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < scrollSteps; i++) {
      const scrollAmount = Math.floor(Math.random() * 300) + 200;
      this.metrics.totalHeight += scrollAmount;
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      await this.delay(delay / scrollSteps);
    }
  }

  private estimatePageHeight(): number {
    return this.metrics.totalHeight || 1000;
  }

  private getItemKey(item: any): string {
    return `${item.title}-${item.href}`.toLowerCase().replace(/\s+/g, '-');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    this.htmlContent = '';
    this.emit('browser:closed');
  }

  getMetrics(): ScrollMetrics {
    return { ...this.metrics };
  }
}