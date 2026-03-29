export interface AntiDetectionConfig {
  userAgentRotation?: boolean;
  viewportRotation?: boolean;
  timezoneSpoofing?: boolean;
  webdriverHiding?: boolean;
  pluginSpoofing?: boolean;
  proxyRotation?: boolean;
  requestDelay?: { min: number; max: number };
  mouseMovement?: boolean;
  scrollBehavior?: 'human' | 'smooth' | 'instant';
}

export class UserAgentRotator {
  private userAgents: string[] = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  ];

  getRandom(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  add(userAgent: string): void {
    this.userAgents.push(userAgent);
  }
}

export class ViewportRotator {
  private viewports: Array<{ width: number; height: number }> = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 },
  ];

  getRandom(): { width: number; height: number } {
    return this.viewports[Math.floor(Math.random() * this.viewports.length)];
  }
}

export class ProxyRotator {
  private proxies: string[] = [];
  private currentIndex = 0;

  constructor(proxies: string[] = []) {
    this.proxies = proxies;
  }

  add(proxy: string): void {
    this.proxies.push(proxy);
  }

  getNext(): string | undefined {
    if (this.proxies.length === 0) return undefined;
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  getRandom(): string | undefined {
    if (this.proxies.length === 0) return undefined;
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }
}

export class RateLimiter {
  private lastRequestTime = 0;
  private minDelay: number;
  private maxDelay: number;

  constructor(minDelay: number = 1000, maxDelay: number = 3000) {
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const requiredDelay = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
    
    if (timeSinceLastRequest < requiredDelay) {
      await new Promise(resolve => setTimeout(resolve, requiredDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  setDelay(min: number, max: number): void {
    this.minDelay = min;
    this.maxDelay = max;
  }
}

export class AntiDetection {
  private config: AntiDetectionConfig;
  private uaRotator: UserAgentRotator;
  private viewportRotator: ViewportRotator;
  private proxyRotator: ProxyRotator;
  private rateLimiter: RateLimiter;

  constructor(config: AntiDetectionConfig = {}) {
    this.config = {
      userAgentRotation: true,
      viewportRotation: true,
      timezoneSpoofing: true,
      webdriverHiding: true,
      pluginSpoofing: true,
      proxyRotation: false,
      requestDelay: { min: 1000, max: 3000 },
      mouseMovement: true,
      scrollBehavior: 'human',
      ...config,
    };

    this.uaRotator = new UserAgentRotator();
    this.viewportRotator = new ViewportRotator();
    this.proxyRotator = new ProxyRotator();
    this.rateLimiter = new RateLimiter(
      this.config.requestDelay?.min,
      this.config.requestDelay?.max
    );
  }

  getBrowserContextOptions(): any {
    const options: any = {};

    if (this.config.userAgentRotation) {
      options.userAgent = this.uaRotator.getRandom();
    }

    if (this.config.viewportRotation) {
      options.viewport = this.viewportRotator.getRandom();
    }

    if (this.config.timezoneSpoofing) {
      options.timezoneId = this.getRandomTimezone();
    }

    if (this.config.proxyRotation) {
      const proxy = this.proxyRotator.getNext();
      if (proxy) {
        options.proxy = { server: proxy };
      }
    }

    return options;
  }

  async applyStealthScripts(page: any): Promise<void> {
    if (this.config.webdriverHiding) {
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' },
          ],
        });

        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : originalQuery(parameters);
      });
    }
  }

  async simulateMouseMovement(page: any, targetSelector?: string): Promise<void> {
    if (!this.config.mouseMovement) return;

    const moveMouse = async () => {
      const x = Math.random() * 800 + 100;
      const y = Math.random() * 600 + 100;
      await page.mouse.move(x, y);
    };

    for (let i = 0; i < 3; i++) {
      await moveMouse();
      await page.waitForTimeout(Math.random() * 200 + 100);
    }

    if (targetSelector) {
      const element = await page.$(targetSelector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        }
      }
    }
  }

  async beforeRequest(): Promise<void> {
    await this.rateLimiter.wait();
  }

  addProxy(proxy: string): void {
    this.proxyRotator.add(proxy);
  }

  setProxies(proxies: string[]): void {
    this.proxyRotator = new ProxyRotator(proxies);
  }

  private getRandomTimezone(): string {
    const timezones = [
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Shanghai',
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }
}
