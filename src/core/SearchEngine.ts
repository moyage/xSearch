import { TavilyProvider } from '../providers/TavilyProvider';
import { ApiHijackerProvider, ApiHijackerConfig } from '../providers/ApiHijackerProvider';
import { OpenClawBrowserEngine } from '../browser/OpenClawBrowserEngine';
import { StreamWriter, streamToFile } from '../utils/StreamWriter';

export interface SearchQuery {
  query: string;
  complexity: 'low' | 'medium' | 'high';
  useLLM: boolean;
  provider?: string;
}

export interface SearchResult {
  query: string;
  content: string;
  sources?: { title: string; url: string; snippet: string }[];
  metadata?: {
    duration: number;
    tokensUsed: any;
    strategy: string;
    [key: string]: any;
  };
  enhanced?: boolean;
  summary?: string;
  visualization?: any;
  [key: string]: any;
}

export interface SearchOptions {
  onProgress?: (progress: number) => void;
  outputPath?: string;
  streamFormat?: 'jsonl' | 'json' | 'ndjson';
}

export interface StreamSearchResult extends SearchResult {
  outputPath: string;
  itemCount: number;
  bytesWritten: number;
}

/**
 * Query Distillation Layer (V7)
 * Converts verbose natural language queries into precise search keywords.
 * Handles site: directives and falls back to mechanical search on failure.
 */
export interface DistilledQuery {
  distilled: string;
  directives: string[];
  original: string;
}

const STOP_WORD_PATTERNS = [
  /\b(what is|how to|can you|please|find|search for|look for|tell me about)\b/gi,
  /\b(the |a |an )/gi,
  /\b(is|are|was|were|be|been|being)\b/gi,
  /\b(in|on|at|to|for|with|by|from|of)\b/gi,
  /\b(i want|i need|i'm looking|i'm trying)\b/gi,
  /^[^\w]+|[^\w]+$/g,
];

function distillQuery(query: string): DistilledQuery {
  const directives: string[] = [];
  
  const siteMatch = query.match(/site:([^\s]+)/gi);
  if (siteMatch) {
    directives.push(...siteMatch);
  }
  
  let cleanQuery = query.replace(/site:[^\s]+/gi, '').trim();
  
  for (const pattern of STOP_WORD_PATTERNS) {
    cleanQuery = cleanQuery.replace(pattern, ' ');
  }
  
  cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();
  
  if (!cleanQuery || cleanQuery.length < 2) {
    cleanQuery = query.replace(/site:[^\s]+/gi, '').trim() || query;
  }
  
  return {
    distilled: cleanQuery,
    directives,
    original: query,
  };
}

export interface SearchEngineConfig {
  providers?: {
    tavily?: { apiKey?: string };
    apiHijacker?: ApiHijackerConfig;
    browser?: {
      endpoint?: string;
      useMcp?: boolean;
      enableSmartScroll?: boolean;
    };
  };
  antiCrawler?: {
    userAgentRotation?: boolean;
    proxyList?: string[];
  };
}

export class SearchEngine {
  private config: SearchEngineConfig;
  private tavilyProvider: TavilyProvider | null = null;
  private apiHijackerProvider: ApiHijackerProvider | null = null;
  private browserEngine: OpenClawBrowserEngine | null = null;

  constructor(config: SearchEngineConfig = {}) {
    this.config = config;

    if (config.providers?.tavily) {
      this.tavilyProvider = new TavilyProvider(config.providers.tavily);
    } else {
      this.tavilyProvider = new TavilyProvider({});
    }

    if (config.providers?.apiHijacker) {
      this.apiHijackerProvider = new ApiHijackerProvider(config.providers.apiHijacker);
    }

    if (config.providers?.browser) {
      this.browserEngine = new OpenClawBrowserEngine({
        endpoint: config.providers.browser.endpoint,
        useMcp: config.providers.browser.useMcp ?? true,
        enableSmartScroll: config.providers.browser.enableSmartScroll ?? true,
      });
    }
  }

  isProviderAvailable(provider: string): boolean {
    switch (provider) {
      case 'tavily':
        return this.tavilyProvider?.isConfigured() ?? false;
      case 'api-hijacker':
        return this.apiHijackerProvider?.isConfigured() ?? false;
      case 'browser':
        return this.browserEngine !== null;
      case 'internal':
        return true;
      default:
        return this.tavilyProvider?.isConfigured() ?? false;
    }
  }

  getAvailableProviders(): string[] {
    const available: string[] = [];

    if (this.isProviderAvailable('api-hijacker')) available.push('api-hijacker');
    if (this.isProviderAvailable('tavily')) available.push('tavily');
    if (this.isProviderAvailable('browser')) available.push('browser');
    available.push('internal');

    return available;
  }

  async search(query: SearchQuery, options: SearchOptions = {}): Promise<SearchResult> {
    const startTime = Date.now();
    
    if (options.outputPath) {
      return this.searchAndStream(query, options, startTime);
    }
    
    const provider = this.selectProvider(query.provider, query.complexity);

    switch (provider) {
      case 'api-hijacker':
        return this.searchWithApiHijacker(query, options, startTime);
      case 'tavily':
        return this.searchWithTavily(query, options, startTime);
      case 'browser':
        return this.searchWithBrowser(query, options, startTime);
      case 'internal':
        return this.searchInternal(query, options, startTime);
      default:
        return this.searchInternal(query, options, startTime);
    }
  }

  private async searchAndStream(query: SearchQuery, options: SearchOptions, startTime: number): Promise<StreamSearchResult> {
    const outputPath = options.outputPath!;

    const writer = new StreamWriter({
      outputPath,
      format: options.streamFormat ?? 'jsonl',
    });
    writer.initialize();

    options.onProgress?.(10);

    const provider = this.selectProvider(query.provider, query.complexity);
    let result: SearchResult;
    
    switch (provider) {
      case 'tavily':
        result = await this.searchWithTavily(query, options, startTime);
        break;
      case 'browser':
        result = await this.searchWithBrowser(query, options, startTime);
        break;
      default:
        result = await this.searchInternal(query, options, startTime);
    }
    
    writer.write({
      query: query.query,
      result,
      timestamp: new Date().toISOString(),
      provider,
    });
    
    options.onProgress?.(90);
    
    const finalResult = await writer.finalize();
    
    options.onProgress?.(100);
    
    return {
      ...result,
      outputPath: finalResult.outputPath,
      itemCount: finalResult.itemCount,
      bytesWritten: finalResult.bytesWritten,
    };
  }

  async batchSearch(
    queries: SearchQuery[],
    options: SearchOptions
  ): Promise<StreamSearchResult> {
    if (!options.outputPath) {
      throw new Error('outputPath is required for batch search streaming');
    }

    const writer = new StreamWriter({
      outputPath: options.outputPath,
      format: options.streamFormat ?? 'jsonl',
    });
    writer.initialize();

    const total = queries.length;
    let completed = 0;

    for (const query of queries) {
      const result = await this.search(query, {
        ...options,
        outputPath: undefined,
      });

      writer.write({
        query: query.query,
        result,
        timestamp: new Date().toISOString(),
      });

      completed++;
      options.onProgress?.((completed / total) * 100);
    }

    const finalResult = await writer.finalize();

    return {
      query: `Batch search: ${queries.length} queries`,
      content: `Results written to ${finalResult.outputPath}`,
      outputPath: finalResult.outputPath,
      itemCount: finalResult.itemCount,
      bytesWritten: finalResult.bytesWritten,
      metadata: {
        duration: 0,
        tokensUsed: { used: 0, cost: 0 },
        strategy: 'batch-stream',
      },
    };
  }

  private selectProvider(preferredProvider?: string, complexity?: string): string {
    if (preferredProvider && this.isProviderAvailable(preferredProvider)) {
      return preferredProvider;
    }

    // For high complexity/deep pagination scenarios, prefer api-hijacker
    // It has built-in pagination lie filtering and rate limit handling
    if (complexity === 'high' && this.isProviderAvailable('api-hijacker')) {
      return 'api-hijacker';
    }

    const providers = this.getAvailableProviders();
    if (providers.length > 0) {
      return providers[0];
    }

    return 'internal';
  }

  private async searchWithTavily(query: SearchQuery, options: SearchOptions, startTime: number): Promise<SearchResult> {
    options.onProgress?.(10);
    
    try {
      if (!this.tavilyProvider?.isConfigured()) {
        throw new Error('Tavily provider not configured');
      }
      
      const result = await this.tavilyProvider.search(query, {
        onProgress: (progress) => options.onProgress?.(10 + progress * 0.8),
      });
      
      options.onProgress?.(100);
      
      return {
        ...result,
        metadata: {
          duration: Date.now() - startTime,
          tokensUsed: result.metadata?.tokensUsed,
          strategy: result.metadata?.strategy || 'tavily',
        },
      };
    } catch (error) {
      console.warn(`Tavily search failed: ${error}. Falling back to internal search.`);
      return this.searchInternal(query, options, startTime);
    }
  }

  private async searchWithApiHijacker(query: SearchQuery, options: SearchOptions, startTime: number): Promise<SearchResult> {
    options.onProgress?.(10);

    try {
      if (!this.apiHijackerProvider?.isConfigured()) {
        throw new Error('ApiHijacker provider not configured');
      }

      const result = await this.apiHijackerProvider.search(query, {
        onProgress: (progress) => options.onProgress?.(10 + progress * 0.8),
      });

      options.onProgress?.(100);

      return {
        ...result,
        metadata: {
          duration: Date.now() - startTime,
          tokensUsed: result.metadata?.tokensUsed,
          strategy: result.metadata?.strategy || 'api-hijacker',
        },
      };
    } catch (error) {
      console.warn(`ApiHijacker search failed: ${error}. Falling back to Tavily.`);
      return this.searchWithTavily(query, options, startTime);
    }
  }

  private async searchWithBrowser(query: SearchQuery, options: SearchOptions, startTime: number): Promise<SearchResult> {
    options.onProgress?.(10);
    
    if (!this.browserEngine) {
      throw new Error('Browser engine not initialized');
    }
    
    try {
      await this.browserEngine.connect();
      
      options.onProgress?.(30);
      
      const distilled = distillQuery(query.query);
      const targetQuery = distilled.distilled.trim();
      let url = '';
      
      if (targetQuery.startsWith('http')) {
        url = targetQuery;
      } else if (distilled.directives.length > 0) {
        const siteMatch = distilled.directives[0].match(/site:([^\s]+)/i);
        const domain = siteMatch ? siteMatch[1] : '';
        url = domain ? `https://${domain}/search?q=${encodeURIComponent(targetQuery)}` : `https://duckduckgo.com/?q=${encodeURIComponent(targetQuery)}&${distilled.directives.map(d => `&${d}`).join('')}`;
      } else {
        url = `https://duckduckgo.com/?q=${encodeURIComponent(targetQuery)}`;
      }
      await this.browserEngine.navigate(url, { waitUntil: 'networkidle', timeout: 60000 });
      
      options.onProgress?.(50);
      
      const cognitiveResult = await this.browserEngine.cognitiveLoadAll({
        maxIterations: 10,
        delay: { min: 800, max: 1500 },
      });
      
      console.log(`[V5 Cognitive] Completed ${cognitiveResult.clickedCount} load button clicks`);
      
      options.onProgress?.(70);
      
      const extraction = await this.browserEngine.extractContent();
      
      options.onProgress?.(100);
      
      return {
        query: query.query,
        content: extraction.content || `[Browser Search Content] for: ${query.query}`,
        sources: extraction.links?.map(link => ({ title: link.text, url: link.href, snippet: '' })) || [],
      };
    } catch (error) {
      console.warn(`Browser search failed: ${error}. Falling back to internal search.`);
      return this.searchInternal(query, options, startTime);
    }
  }

  private async searchInternal(query: SearchQuery, options: SearchOptions, startTime: number): Promise<SearchResult> {
    options.onProgress?.(50);
    
    const result: SearchResult = {
      query: query.query,
      content: `No external search providers are available. Query "${query.query}" could not be processed.\n\n` +
        `Suggestions:\n` +
        `1. Configure Tavily API key in environment or config\n` +
        `2. Ensure network connectivity\n` +
        `3. Check provider availability`,
      sources: [],
      metadata: {
        duration: Date.now() - startTime,
        tokensUsed: { used: 0, cost: 0 },
        strategy: 'internal-fallback',
      },
    };
    
    options.onProgress?.(100);
    
    return result;
  }

  async close(): Promise<void> {
    if (this.browserEngine) {
      await this.browserEngine.close();
    }
  }
}