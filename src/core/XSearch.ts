/**
 * XSearch - 智能搜索增强技能
 * 主入口文件
 */

import { SearchEngine, SearchQuery, SearchResult, SearchOptions } from './core/SearchEngine';
import { TokenManager, TokenBudget } from './core/TokenManager';
import { ProgressTracker, Progress } from './core/ProgressTracker';
import { VisualizationEngine } from './visualization/VisualizationEngine';
import { EventEmitter } from 'events';

export interface XSearchConfig {
  /** Token 预算配置 */
  tokenBudget?: Partial<TokenBudget>;
  /** 搜索提供商配置 */
  providers?: {
    tavily?: { apiKey?: string };
    browser?: { engine?: 'playwright' | 'puppeteer'; headless?: boolean };
  };
  /** 反爬虫配置 */
  antiCrawler?: {
    userAgentRotation?: boolean;
    proxyList?: string[];
  };
  /** 输出配置 */
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
        browser: { engine: 'playwright', headless: true },
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

  /**
   * 执行简单查询
   * 自动选择最优策略，简单场景零 Token
   */
  async query(query: string, options: QueryOptions = {}): Promise<SearchResult> {
    const startTime = Date.now();
    
    // 初始化进度追踪
    this.progressTracker.start({
      taskName: query,
      stages: ['search', 'extract', 'analyze', 'visualize'],
    });

    try {
      // 分析查询，选择策略
      const strategy = this.determineStrategy(query, options);
      
      this.progressTracker.updateStage('search', { 
        status: 'running', 
        provider: strategy.provider 
      });

      // 执行搜索
      const searchQuery: SearchQuery = {
        query,
        complexity: options.complexity || 'medium',
        useLLM: strategy.useLLM,
        provider: strategy.provider,
      };

      const result = await this.searchEngine.search(searchQuery, {
        onProgress: (progress) => {
          this.progressTracker.updateStage('search', { progress });
          options.onProgress?.(this.progressTracker.getProgress());
        },
      });

      this.progressTracker.updateStage('search', { status: 'completed' });

      // 如果需要且预算允许，使用 LLM 增强
      if (strategy.useLLM && this.tokenManager.canUseTokens(1000)) {
        this.progressTracker.updateStage('analyze', { status: 'running' });
        
        const enhancedResult = await this.enhanceWithLLM(result, {
          maxTokens: options.maxTokens,
          onStream: options.onStream,
        });

        this.progressTracker.updateStage('analyze', { status: 'completed' });
        
        // 生成可视化
        if (this.config.output.visualization && options.outputFormat) {
          this.progressTracker.updateStage('visualize', { status: 'running' });
          
          enhancedResult.visualization = await this.visualizationEngine.render(
            enhancedResult,
            options.outputFormat
          );

          this.progressTracker.updateStage('visualize', { status: 'completed' });
        }

        this.progressTracker.finish();
        
        return {
          ...enhancedResult,
          metadata: {
            duration: Date.now() - startTime,
            tokensUsed: this.tokenManager.getUsage(),
            strategy: strategy.name,
          },
        };
      }

      this.progressTracker.finish();

      return {
        ...result,
        metadata: {
          duration: Date.now() - startTime,
          tokensUsed: { used: 0, cost: 0 },
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
            onProgress: undefined, // 批量模式下不转发单个进度
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
   * 深度研究
   * 多轮搜索、交叉验证、综合分析
   */
  async research(topic: string, depth: 'shallow' | 'medium' | 'deep' = 'medium'): Promise<SearchResult> {
    const iterations = depth === 'shallow' ? 2 : depth === 'medium' ? 3 : 5;
    
    this.progressTracker.start({
      taskName: `深度研究: ${topic}`,
      stages: ['initial_search', 'expansion', 'synthesis'],
    });

    // 初始搜索
    this.progressTracker.updateStage('initial_search', { status: 'running' });
    const initialResult = await this.query(topic, { useLLM: true });
    this.progressTracker.updateStage('initial_search', { status: 'completed' });

    // 扩展搜索（基于初始结果提取关键词）
    this.progressTracker.updateStage('expansion', { status: 'running' });
    const subQueries = this.extractSubQueries(initialResult, iterations);
    const expandedResults = await this.batch(subQueries, { 
      useLLM: false, // 扩展搜索不使用 LLM
      batchSize: 5,
    });
    this.progressTracker.updateStage('expansion', { status: 'completed' });

    // 综合所有结果
    this.progressTracker.updateStage('synthesis', { status: 'running' });
    const synthesizedResult = await this.synthesizeResults(
      [initialResult, ...expandedResults],
      topic
    );
    this.progressTracker.updateStage('synthesis', { status: 'completed' });

    this.progressTracker.finish();

    return synthesizedResult;
  }

  /**
   * 对比分析
   * 多维度对比多个主题
   */
  async compare(items: string[], criteria: string[]): Promise<SearchResult> {
    this.progressTracker.start({
      taskName: `对比分析: ${items.join(' vs ')}`,
      stages: ['collect', 'extract', 'compare'],
    });

    // 收集每个 item 的信息
    this.progressTracker.updateStage('collect', { status: 'running' });
    const itemResults = await this.batch(
      items.map((item) => `${item} 详细介绍`),
      { useLLM: false }
    );
    this.progressTracker.updateStage('collect', { status: 'completed' });

    // 提取对比维度
    this.progressTracker.updateStage('extract', { status: 'running' });
    const extractedData = await Promise.all(
      itemResults.map((result) => this.extractComparisonData(result, criteria))
    );
    this.progressTracker.updateStage('extract', { status: 'completed' });

    // 生成对比表
    this.progressTracker.updateStage('compare', { status: 'running' });
    const comparisonResult = await this.generateComparison(
      items,
      criteria,
      extractedData
    );
    this.progressTracker.updateStage('compare', { status: 'completed' });

    this.progressTracker.finish();

    return comparisonResult;
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

    // 中等复杂度：浏览器提取 + 可选 LLM
    if (options.complexity === 'medium') {
      return {
        name: 'standard',
        provider: 'browser',
        useLLM: options.useLLM ?? false,
      };
    }

    // 高复杂度：全功能 + LLM 增强
    return {
      name: 'advanced',
      provider: 'hybrid',
      useLLM: true,
    };
  }

  /**
   * 使用 LLM 增强结果
   */
  private async enhanceWithLLM(
    result: SearchResult,
    options: { maxTokens?: number; onStream?: (chunk: string) => void }
  ): Promise<SearchResult> {
    // 预留：集成 LLM 调用
    // 实际实现需要接入具体的 LLM provider
    
    const budget = options.maxTokens || 2000;
    
    if (!this.tokenManager.canUseTokens(budget)) {
      return {
        ...result,
        note: 'Token 预算不足，跳过 LLM 增强',
      };
    }

    // 模拟 LLM 增强（实际应调用 LLM API）
    this.tokenManager.consume(budget, 'gpt-4');

    return {
      ...result,
      enhanced: true,
      summary: 'LLM 生成的摘要（预留）',
    };
  }

  /**
   * 从结果中提取子查询
   */
  private extractSubQueries(result: SearchResult, count: number): string[] {
    // 预留：从初始结果中提取关键词和子主题
    return Array(count).fill(null).map((_, i) => `${result.query} 子主题 ${i + 1}`);
  }

  /**
   * 综合多个结果
   */
  private async synthesizeResults(results: SearchResult[], topic: string): Promise<SearchResult> {
    // 预留：使用 LLM 综合多个搜索结果
    return {
      query: topic,
      content: results.map((r) => r.content).join('\n\n'),
      sources: results.flatMap((r) => r.sources || []),
      synthesized: true,
    };
  }

  /**
   * 提取对比数据
   */
  private async extractComparisonData(result: SearchResult, criteria: string[]): Promise<any> {
    // 预留：提取结构化的对比数据
    return {
      result,
      criteria,
    };
  }

  /**
   * 生成对比结果
   */
  private async generateComparison(
    items: string[],
    criteria: string[],
    data: any[]
  ): Promise<SearchResult> {
    // 预留：生成对比表格和可视化
    return {
      query: `对比: ${items.join(', ')}`,
      items,
      criteria,
      data,
      visualization: {
        type: 'comparison_table',
        data,
      },
    };
  }
}

// 导出类型
export * from './core/SearchEngine';
export * from './core/TokenManager';
export * from './core/ProgressTracker';
export * from './visualization/VisualizationEngine';

// 默认导出
export default XSearch;
