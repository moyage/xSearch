/**
 * XSearch - 智能搜索增强技能
 * 主入口文件
 */

import { SearchEngine, SearchQuery, SearchResult, SearchOptions } from './SearchEngine';
import { TokenManager, TokenBudget } from './TokenManager';
import { ProgressTracker, Progress } from './ProgressTracker';
import { VisualizationEngine } from '../visualization/VisualizationEngine';
import { EventEmitter } from 'events';
import { V8AutonomousSearchOrchestrator } from '../v8/V8AutonomousSearchOrchestrator';

export interface XSearchConfig {
  tokenBudget?: Partial<TokenBudget>;
  providers?: {
    tavily?: { apiKey?: string };
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
  output?: {
    stream?: boolean;
    showProgress?: boolean;
    visualization?: boolean;
  };
}

export interface QueryOptions {
  /** 复杂度级别，影响策略选择 */
  complexity?: 'low' | 'medium' | 'high';
  /** 最大 Token 预算 */
  maxTokens?: number;
  /** 是否使用 LLM 增强 */
  useLLM?: boolean;
  /** 指定搜索提供商 */
  provider?: string;
  /** 输出格式 */
  outputFormat?: 'text' | 'table' | 'chart' | 'infographic';
  /** 进度回调 */
  onProgress?: (progress: Progress) => void;
  /** 流式输出回调 */
  onStream?: (chunk: string) => void;
  /** V3 旁路落盘支持 */
  outputPath?: string;
}

export interface BatchOptions extends QueryOptions {
  /** 批次大小 */
  batchSize?: number;
  /** 并行数 */
  parallel?: number;
  /** 批次间隔（毫秒） */
  delayBetween?: { min: number; max: number };
}

export class XSearch extends EventEmitter {
  private searchEngine: SearchEngine;
  private tokenManager: TokenManager;
  private progressTracker: ProgressTracker;
  private visualizationEngine: VisualizationEngine;
  private config: Required<XSearchConfig>;

  constructor(config: XSearchConfig = {}) {
    super();
    
    this.config = {
      tokenBudget: {
        maxTokens: 5000,
        warningThreshold: 0.8,
        abortThreshold: 1.0,
        ...config.tokenBudget,
      },
      providers: {
        tavily: {},
        browser: { useMcp: true, enableSmartScroll: true },
        ...config.providers,
      },
      antiCrawler: {
        userAgentRotation: true,
        proxyList: [],
        ...config.antiCrawler,
      },
      output: {
        stream: true,
        showProgress: true,
        visualization: true,
        ...config.output,
      },
    };

    this.tokenManager = new TokenManager(this.config.tokenBudget);
    this.progressTracker = new ProgressTracker();
    this.searchEngine = new SearchEngine({
      providers: this.config.providers,
      antiCrawler: this.config.antiCrawler,
    });
    this.visualizationEngine = new VisualizationEngine();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // 转发进度事件
    this.progressTracker.on('update', (progress: Progress) => {
      this.emit('progress', progress);
    });

    // Token 预警
    this.tokenManager.on('warning', (usage) => {
      this.emit('tokenWarning', usage);
    });

    // Token 耗尽
    this.tokenManager.on('exhausted', (usage) => {
      this.emit('tokenExhausted', usage);
    });
  }

  async query(query: string, options: QueryOptions = {}): Promise<SearchResult> {
    const startTime = Date.now();
    
    this.progressTracker.start({
      taskName: query,
      stages: ['search', 'extract', 'visualize'],
    });

    try {
      const strategy = this.determineStrategy(query, options);
      
      this.progressTracker.updateStage('search', { 
        status: 'running', 
        provider: strategy.provider 
      });

      const searchQuery: SearchQuery = {
        query,
        complexity: options.complexity || 'medium',
        useLLM: strategy.useLLM,
        provider: strategy.provider,
      };

      let result;
      
      if (strategy.provider === 'browser' && options.complexity === 'high') {
         console.log("[V8 Router] Engaging Autonomous Infiltration Protocol...");
         const orchestrator = new V8AutonomousSearchOrchestrator();
         
         const siteMatch = query.match(/site:([^\s]+)/i);
         const targetSite = siteMatch ? siteMatch[1] : '';
         const fallbackUrl = targetSite ? `https://${targetSite}` : '';

         const v8Result = await orchestrator.search(fallbackUrl, query);
         
         result = {
            query,
            content: v8Result.results.map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nMatch Score: ${r.matchScore}\nSnippet: ${r.snippet}`).join('\n\n'),
            sources: v8Result.results.map((r: any) => ({ title: r.title, url: r.url, snippet: r.snippet })),
            metadata: { duration: v8Result.metrics ? (v8Result.metrics.distillationTime + v8Result.metrics.reconnaissanceTime + v8Result.metrics.domInteractionTime + v8Result.metrics.rerankTime) : 0, strategy: 'v8-autonomous', tokensUsed: {used: 0, cost: 0} },
            visualization: undefined
         };
      } else {
         result = await this.searchEngine.search(searchQuery, {
           outputPath: options.outputPath,
           onProgress: (progress) => {
             this.progressTracker.updateStage('search', { progress });
             options.onProgress?.(this.progressTracker.getProgress());
           },
         });
      }

      this.progressTracker.updateStage('search', { status: 'completed' });

      if (this.config.output.visualization && options.outputFormat) {
        this.progressTracker.updateStage('visualize', { status: 'running' });
        
        result.visualization = await this.visualizationEngine.render(
          result,
          options.outputFormat
        );

        this.progressTracker.updateStage('visualize', { status: 'completed' });
      }

      this.progressTracker.finish();
      
      return {
        ...result,
        metadata: {
          duration: Date.now() - startTime,
          tokensUsed: this.tokenManager.getUsage(),
          strategy: strategy.name,
        },
      };

    } catch (error) {
      this.progressTracker.fail(error as Error);
      throw error;
    }
  }

  /**
   * 批量查询
   * 支持大规模搜索，智能分批次处理
   */
  async batch(queries: string[], options: BatchOptions = {}): Promise<SearchResult[]> {
    const batchSize = options.batchSize || 10;
    const parallel = options.parallel || 3;
    const delayBetween = options.delayBetween || { min: 1000, max: 3000 };

    const results: SearchResult[] = [];
    const total = queries.length;

    this.progressTracker.start({
      taskName: `批量搜索 (${total} 个查询)`,
      stages: ['batching'],
      totalTasks: total,
    });

    // 分批处理
    for (let i = 0; i < total; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      this.progressTracker.updateStage('batching', {
        current: i + 1,
        total,
        batchIndex: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(total / batchSize),
      });

      // 并行处理批次内查询
      const batchResults = await Promise.all(
        batch.map((query) =>
          this.query(query, {
            ...options,
            onProgress: undefined,
          })
        )
      );

      results.push(...batchResults);

      // 批次间延迟（避免 rate limit）
      if (i + batchSize < total) {
        const delay = Math.random() * (delayBetween.max - delayBetween.min) + delayBetween.min;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.progressTracker.finish();

    return results;
  }

  /**
   * 获取当前进度
   */
  getProgress(): Progress {
    return this.progressTracker.getProgress();
  }

  /**
   * 获取 Token 使用情况
   */
  getTokenUsage() {
    return this.tokenManager.getUsage();
  }

  /**
   * 确定搜索策略
   */
  private determineStrategy(query: string, options: QueryOptions): { 
    name: string; 
    provider: string; 
    useLLM: boolean; 
  } {
    // 如果明确指定了 provider
    if (options.provider) {
      return {
        name: 'specified',
        provider: options.provider,
        useLLM: options.useLLM ?? (options.complexity === 'high'),
      };
    }

    // 简单查询：使用内置搜索或 Tavily（零 Token）
    if (options.complexity === 'low' || query.length < 50) {
      return {
        name: 'simple',
        provider: 'tavily',
        useLLM: false,
      };
    }

    // 中等复杂度：浏览器提取
    if (options.complexity === 'medium') {
      return {
        name: 'standard',
        provider: 'browser',
        useLLM: false,
      };
    }

    // 高复杂度：全功能 extraction
    return {
      name: 'advanced',
      provider: 'hybrid',
      useLLM: false,
    };
  }
}

// 导出类型
export * from './SearchEngine';
export * from './TokenManager';
export * from './ProgressTracker';
export * from '../visualization/VisualizationEngine';

// 默认导出
export default XSearch;
