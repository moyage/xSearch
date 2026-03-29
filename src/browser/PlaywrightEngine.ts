import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { EventEmitter } from 'events';

export interface BrowserConfig {
  headless?: boolean;
  slowMo?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export interface PageAction {
  type: 'goto' | 'click' | 'fill' | 'scroll' | 'wait' | 'screenshot' | 'extract';
  selector?: string;
  value?: string;
  options?: any;
}

export interface ExtractionResult {
  url: string;
  title: string;
  content: string;
  links: { text: string; href: string }[];
  images: { alt: string; src: string }[];
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
    publishedTime?: string;
  };
}

export class PlaywrightEngine extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig = {}) {
    super();
    this.config = {
      headless: config.headless ?? true,
      slowMo: config.slowMo ?? 0,
      viewport: config.viewport || { width: 1280, height: 720 },
      userAgent: config.userAgent,
      proxy: config.proxy,
    };
  }

  async launch(): Promise<void> {
    if (this.browser) return;

    const launchOptions: any = {
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    };

    if (this.config.proxy) {
      launchOptions.proxy = this.config.proxy;
    }

    this.browser = await chromium.launch(launchOptions);
    
    const contextOptions: any = {
      viewport: this.config.viewport,
    };

    if (this.config.userAgent) {
      contextOptions.userAgent = this.config.userAgent;
    }

    this.context = await this.browser.newContext(contextOptions);
    
    this.emit('launched');
  }

  async newPage(): Promise<Page> {
    if (!this.context) {
      await this.launch();
    }
    return this.context!.newPage();
  }

  async executeActions(url: string, actions: PageAction[]): Promise<any> {
    const page = await this.newPage();
    const results: any = {};

    try {
      for (const action of actions) {
        switch (action.type) {
          case 'goto':
            await page.goto(url, { waitUntil: 'networkidle' });
            break;
            
          case 'click':
            if (action.selector) {
              await page.click(action.selector);
            }
            break;
            
          case 'fill':
            if (action.selector && action.value) {
              await page.fill(action.selector, action.value);
            }
            break;
            
          case 'scroll':
            await this.smartScroll(page, action.options);
            break;
            
          case 'wait':
            if (action.selector) {
              await page.waitForSelector(action.selector, action.options);
            } else {
              await page.waitForTimeout(action.options?.timeout || 1000);
            }
            break;
            
          case 'screenshot':
            results.screenshot = await page.screenshot({ 
              fullPage: action.options?.fullPage ?? true,
              type: 'png',
            });
            break;
            
          case 'extract':
            results.extraction = await this.extractContent(page);
            break;
        }
      }

      return results;

    } finally {
      await page.close();
    }
  }

  async extractContent(page: Page): Promise<ExtractionResult> {
    return page.evaluate(() => {
      const getMetaContent = (name: string) => {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="og:${name}"]`);
        return meta?.getAttribute('content') || undefined;
      };

      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: a.textContent?.trim() || '',
        href: (a as HTMLAnchorElement).href,
      })).filter(l => l.text && l.href.startsWith('http'));

      const images = Array.from(document.querySelectorAll('img[src]')).map(img => ({
        alt: img.alt || '',
        src: (img as HTMLImageElement).src,
      })).filter(img => img.src.startsWith('http'));

      // 提取主内容
      const article = document.querySelector('article, main, [role="main"]');
      const content = article?.textContent || document.body?.textContent || '';

      return {
        url: window.location.href,
        title: document.title,
        content: content.substring(0, 50000), // 限制内容长度
        links: links.slice(0, 100),
        images: images.slice(0, 50),
        metadata: {
          description: getMetaContent('description'),
          keywords: getMetaContent('keywords'),
          author: getMetaContent('author'),
          publishedTime: getMetaContent('article:published_time'),
        },
      };
    });
  }

  async smartScroll(page: Page, options: any = {}): Promise<void> {
    const behavior = options.behavior || 'smooth';
    const times = options.times || 3;
    const delay = options.delay || { min: 500, max: 1500 };

    for (let i = 0; i < times; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.8);
      });

      const waitTime = Math.random() * (delay.max - delay.min) + delay.min;
      await page.waitForTimeout(waitTime);

      // 检查是否到达底部
      const isAtBottom = await page.evaluate(() => {
        return window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
      });

      if (isAtBottom) break;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.emit('closed');
    }
  }
}
