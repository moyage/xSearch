import { chromium, Browser, Page } from 'playwright';
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
  private browser: Browser | null = null;
  private metrics: ScrollMetrics;
  private checkpoint: any = null;

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

  async initialize(headless: boolean = true): Promise<void> {
    this.browser = await chromium.launch({
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
    
    this.emit('browser:launched');
  }

  async crawl(url: string, options: WaterfallOptions): Promise<any[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const startTime = Date.now();
    const allItems = new Map(); // 使用 Map 去重
    
    const page = await this.browser!.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: this.getRandomUserAgent(),
    });

    // 注入反检测脚本
    await this.injectStealthScripts(page);

    try {
      this.emit('crawl:started', { url });

      // 加载页面
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(3000);

      // 如果有断点，恢复到之前的位置
      if (this.checkpoint) {
        await this.restoreCheckpoint(page, this.checkpoint);
      }

      const maxScrolls = options.maxScrolls || 100;
      const waitTime = options.waitTime || 2000;
      
      let previousHeight = 0;
      let noNewContentCount = 0;
      const checkpointInterval = options.checkpointInterval || 10;

      for (let i = 0; i < maxScrolls; i++) {
        this.metrics.scrollCount = i + 1;

        // 提取当前可见的项目
        const items = await this.extractItems(page, options.extractSelector);
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

        // 检查是否应该停止
        if (options.stopWhenNoNewContent && this.metrics.newItemsInLastScroll === 0) {
          noNewContentCount++;
          if (noNewContentCount >= 3) {
            this.emit('crawl:stopped', { reason: 'no_new_content' });
            break;
          }
        } else {
          noNewContentCount = 0;
        }

        // 保存检查点
        if ((i + 1) % checkpointInterval === 0) {
          this.checkpoint = await this.createCheckpoint(page, Array.from(allItems.values()));
          this.emit('checkpoint:saved', { scrollNumber: i + 1, itemsCount: allItems.size });
        }

        // 滚动页面
        const currentHeight = await this.smartScroll(page, options.scrollDelay);
        this.metrics.totalHeight = currentHeight;

        // 等待新内容加载
        await page.waitForTimeout(waitTime);

        // 检查是否到达底部
        if (currentHeight === previousHeight) {
          this.emit('crawl:stopped', { reason: 'reached_bottom' });
          break;
        }

        previousHeight = currentHeight;
      }

      this.metrics.timeElapsed = Date.now() - startTime;
      
      this.emit('crawl:completed', {
        totalItems: allItems.size,
        scrolls: this.metrics.scrollCount,
        timeElapsed: this.metrics.timeElapsed,
      });

      return Array.from(allItems.values());

    } finally {
      await page.close();
    }
  }

  private async injectStealthScripts(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // 覆盖 webdriver 属性
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // 模拟插件
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
          { name: 'Widevine Content Decryption Module', filename: 'widevinecdmadapter.dll' },
        ],
      });

      // 覆盖 permissions API
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);

      // 删除 automation 标记
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl;
      delete (window as any).cdc_aemuxpECalDzAeT;
    });
  }

  private async smartScroll(page: Page, delayRange?: { min: number; max: number }): Promise<number> {
    const minDelay = delayRange?.min || 500;
    const maxDelay = delayRange?.max || 1500;

    // 模拟人类滚动行为
    const scrollSteps = Math.floor(Math.random() * 3) + 3; // 3-5 步
    
    for (let i = 0; i < scrollSteps; i++) {
      const scrollAmount = Math.floor(Math.random() * 300) + 200; // 200-500px
      
      await page.mouse.move(
        Math.floor(Math.random() * 500) + 100,
        Math.floor(Math.random() * 500) + 100
      );
      
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);

      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      await page.waitForTimeout(delay / scrollSteps);
    }

    // 返回当前页面高度
    return await page.evaluate(() => document.body.scrollHeight);
  }

  private async extractItems(page: Page, selector: string): Promise<any[]> {
    return page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);
      return Array.from(elements).map((el, index) => {
        const text = el.textContent || '';
        const link = el.querySelector('a');
        const href = link?.getAttribute('href') || '';
        const title = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]')?.textContent || 
                      text.substring(0, 100);
        
        return {
          index,
          title: title.trim(),
          text: text.trim().substring(0, 500),
          href,
          html: el.outerHTML.substring(0, 1000),
        };
      });
    }, selector);
  }

  private getItemKey(item: any): string {
    // 使用标题 + URL 作为唯一键
    return `${item.title}-${item.href}`.toLowerCase().replace(/\s+/g, '-');
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private async createCheckpoint(page: Page, items: any[]): Promise<any> {
    const scrollPosition = await page.evaluate(() => window.scrollY);
    const url = page.url();
    
    return {
      url,
      scrollPosition,
      itemsCount: items.length,
      lastItem: items[items.length - 1],
      timestamp: new Date().toISOString(),
    };
  }

  private async restoreCheckpoint(page: Page, checkpoint: any): Promise<void> {
    await page.evaluate((position) => {
      window.scrollTo(0, position);
    }, checkpoint.scrollPosition);
    
    await page.waitForTimeout(2000);
    this.emit('checkpoint:restored', checkpoint);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.emit('browser:closed');
    }
  }

  getMetrics(): ScrollMetrics {
    return { ...this.metrics };
  }
}
