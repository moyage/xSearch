# XSearch - 智能搜索增强技能

## 项目概述

**XSearch** 是一个为 OpenClaw 及类 Claw 系统设计的插件式标准化增强技能，提供强大的外部信息搜索、检索、分析和可视化能力。

### 核心定位

- **插件式安装**：一键安装，开箱即用
- **零配置启动**：简单场景无需配置，复杂场景灵活配置
- **智能降级**：从"零Token"到"全功能"的无缝切换
- **搜索能力顶级**：应对从简单页面到复杂动态网站的各种场景

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      XSearch Core                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Search     │  │   Browser    │  │   Anti-      │      │
│  │   Engine     │  │   Engine     │  │   Crawler    │      │
│  │              │  │              │  │   Defense    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼──────┐      │
│  │           Content Extraction Layer                │      │
│  │  (智能选择最佳提取策略：静态/动态/API)            │      │
│  └──────┬────────────────────────────────────────────┘      │
│         │                                                    │
│  ┌──────▼──────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Token     │  │   Progress   │  │ Visualization│      │
│  │   Manager   │  │   Tracker    │  │   Engine     │      │
│  │             │  │              │  │              │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Output Manager │
                    │ (流式/分批/最终) │
                    └─────────────────┘
```

## 核心模块详解

### 1. Search Engine Layer（搜索引擎层）

多层级搜索策略，智能选择最优方案：

#### 1.1 Provider 架构

```typescript
interface SearchProvider {
  name: string;
  priority: number;        // 优先级，用于自动选择
  requiresToken: boolean;  // 是否需要 Token
  rateLimit: RateLimit;
  
  search(query: SearchQuery): Promise<SearchResult>;
  supports(query: SearchQuery): boolean;  // 是否支持该查询
}

// 内置 Providers
const providers: SearchProvider[] = [
  {
    name: 'internal',      // OpenClaw 内置搜索
    priority: 1,
    requiresToken: false,
  },
  {
    name: 'tavily',        // Tavily Search API
    priority: 2,
    requiresToken: false,  // 但可能需要 API Key
  },
  {
    name: 'headless',      // 无头浏览器
    priority: 3,
    requiresToken: false,
  },
  {
    name: 'llm_enhanced',  // 大模型增强搜索
    priority: 4,
    requiresToken: true,
  }
];
```

#### 1.2 搜索策略矩阵

| 场景 | 复杂度 | 推荐 Provider | Token 消耗 | 说明 |
|------|--------|---------------|------------|------|
| 简单事实查询 | 低 | internal/tavily | 0 | 直接获取答案 |
| 单页面内容提取 | 低 | headless | 0 | 静态页面直接抓取 |
| 多源对比 | 中 | tavily + headless | 0-低 | 结构化数据提取 |
| 动态网站 | 中-高 | headless | 0-低 | 瀑布流/SPA处理 |
| 深度分析 | 高 | llm_enhanced | 中-高 | 需要推理总结 |
| 大规模批量 | 高 | hybrid | 可控 | 分批次处理 |

### 2. Browser Engine Layer（浏览器引擎层）

#### 2.1 多引擎支持

```typescript
interface BrowserEngine {
  name: string;
  type: 'headless' | 'desktop' | 'remote';
  
  // 核心能力
  capabilities: {
    javascript: boolean;     // 支持 JS 执行
    cookies: boolean;        // Cookie 管理
    proxy: boolean;          // 代理支持
    screenshots: boolean;    // 截图能力
    pdf: boolean;           // PDF 导出
  };
  
  // 生命周期管理
  launch(options: LaunchOptions): Promise<Browser>;
  newPage(): Promise<Page>;
  close(): Promise<void>;
}

// 内置引擎
const browserEngines = {
  // 默认内置（Playwright）
  playwright: {
    type: 'headless',
    priority: 1,
  },
  
  // Puppeteer（备用）
  puppeteer: {
    type: 'headless',
    priority: 2,
  },
  
  // 用户本地浏览器
  local: {
    type: 'desktop',
    priority: 3,
    // 唤起用户本地 Chrome/Safari/Firefox
  },
  
  // Selenium（兼容性）
  selenium: {
    type: 'remote',
    priority: 4,
  }
};
```

#### 2.2 智能页面处理

```typescript
interface PageHandler {
  // 页面加载策略
  loadStrategy: 'networkidle' | 'domcontentloaded' | 'load' | 'custom';
  
  // 动态内容检测
  detectDynamicContent(): Promise<DynamicContent[]>;
  
  // 自动滚动（瀑布流）
  autoScroll(options: ScrollOptions): Promise<void>;
  
  // 反检测模拟
  antiDetection: {
    userAgent: string;
    viewport: Viewport;
    timezone: string;
    webdriver: boolean;
    plugins: Plugin[];
  };
}
```

### 3. Anti-Crawler Defense（反爬虫对抗层）

#### 3.1 反检测策略

```typescript
interface AntiDetectionStrategy {
  // 浏览器指纹伪装
  fingerprint: {
    userAgent: Rotation<string>;     // UA 轮换
    screenResolution: Rotation<Resolution>;
    colorDepth: number;
    pixelRatio: number;
    touch: boolean;
  };
  
  // 行为模拟
  behavior: {
    mouseMovement: boolean;          // 模拟鼠标移动
    scrollPattern: 'human' | 'random' | 'smooth';
    clickDelay: Range;              // 点击延迟
    typingSpeed: Range;             // 打字速度
  };
  
  // 请求模式
  requestPattern: {
    concurrency: number;             // 并发控制
    delayBetween: Range;            // 请求间隔
    retryStrategy: RetryStrategy;
    proxyRotation: boolean;
  };
}
```

#### 3.2 常见对抗方案

| 防护机制 | 对抗策略 |
|----------|----------|
| User-Agent 检测 | UA 池轮换 + 真实浏览器指纹 |
| IP 频率限制 | 代理池 + 智能限速 |
| Cookie/Session | 真实 Cookie 管理 + 会话保持 |
| JavaScript 挑战 | 真实浏览器执行环境 |
| Canvas/WebGL 指纹 | 随机化或标准化指纹 |
| 行为分析 | 人类行为模拟（鼠标轨迹、点击模式） |
| CAPTCHA | 自动化识别或人工介入提示 |
| 瀑布流/懒加载 | 自动滚动触发 + 内容监听 |

### 4. Token Manager（Token 管理层）

#### 4.1 智能 Token 预算

```typescript
interface TokenBudget {
  // 任务级别预算
  task: {
    maxTokens: number;
    warningThreshold: number;  // 预警阈值
    abortThreshold: number;    // 强制停止阈值
  };
  
  // 分层策略
  layers: {
    search: number;      // 搜索阶段
    extraction: number;  // 提取阶段
    analysis: number;    // 分析阶段
    summary: number;     // 总结阶段
  };
  
  // 降级策略
  fallback: {
    onTokenExhausted: 'stop' | 'summarize' | 'continue_without_llm';
    onBudgetWarning: 'notify' | 'auto_reduce_depth';
  };
}
```

#### 4.2 Token 消耗可视化

```typescript
interface TokenUsage {
  used: number;
  remaining: number;
  cost: number;  // 估算成本
  
  // 按阶段分解
  breakdown: {
    phase: string;
    tokens: number;
    model: string;
  }[];
  
  // 实时更新
  update(delta: TokenDelta): void;
}
```

### 5. Progress Tracker（进度追踪层）

#### 5.1 多层级进度

```typescript
interface ProgressTracker {
  // 整体任务进度
  overall: {
    status: 'pending' | 'searching' | 'extracting' | 'analyzing' | 'completed' | 'error';
    percentage: number;
    eta: number;  // 预计完成时间
  };
  
  // 子任务进度
  subtasks: {
    id: string;
    name: string;
    status: TaskStatus;
    progress: number;
    details: string;
  }[];
  
  // 流式更新
  stream: {
    onUpdate: (progress: Progress) => void;
    batchSize: number;  // 批量更新间隔
  };
}
```

#### 5.2 可视化输出格式

```
🔍 XSearch Task: "分析 React 19 新特性"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%

📊 进度详情:
  ✓ 搜索阶段 (3 sources)     [████░░░░░░] 30% - 2.3s
  ✓ 内容提取 (5 pages)       [████████░░] 80% - 8.7s
  → 分析阶段                 [░░░░░░░░░░] 0%  - estimating...

💰 Token 消耗:
  已用: 1,234 / 10,000 (12.3%)
  预估剩余: 3,500 tokens
  当前成本: $0.012

📝 实时输出:
  [2024-01-15 10:23:45] 发现 3 个权威来源
  [2024-01-15 10:23:52] 成功提取 React 官方文档
  [2024-01-15 10:24:01] 正在分析 Server Components...
```

### 6. Visualization Engine（可视化引擎）

#### 6.1 输出格式支持

```typescript
interface VisualizationEngine {
  // 文本输出
  text: {
    markdown: boolean;
    highlight: boolean;
    collapsible: boolean;  // 可折叠章节
  };
  
  // 表格输出
  table: {
    sortable: boolean;
    filterable: boolean;
    exportFormats: ['csv', 'xlsx', 'json'];
  };
  
  // 图表输出
  charts: {
    types: ['bar', 'line', 'pie', 'heatmap', 'tree', 'network'];
    interactive: boolean;
    exportFormats: ['png', 'svg', 'html'];
  };
  
  // 知识图谱
  knowledgeGraph: {
    nodes: Node[];
    edges: Edge[];
    layout: 'force' | 'hierarchical' | 'circular';
  };
  
  // 一图胜千言
  infographic: {
    template: string;
    autoGenerate: boolean;
    style: 'modern' | 'minimal' | 'colorful';
  };
}
```

#### 6.2 智能模板系统

```typescript
const templates = {
  comparison: {
    name: '对比分析图',
    description: '适合产品/技术/方案对比',
    elements: ['table', 'radar_chart', 'pros_cons'],
  },
  
  timeline: {
    name: '时间线图',
    description: '适合历史/发展/路线图',
    elements: ['timeline', 'milestone', 'trend_line'],
  },
  
  research: {
    name: '研究报告',
    description: '适合深度研究/调研报告',
    elements: ['summary_card', 'data_table', 'insight_box', 'source_list'],
  },
  
  code_analysis: {
    name: '代码分析',
    description: '适合代码库分析/架构图',
    elements: ['dependency_graph', 'metrics_table', 'hotspot_map'],
  }
};
```

## 使用场景示例

### 场景 1：简单事实查询（零 Token）

```typescript
// 用户查询
const query = "Python 3.12 的新特性有哪些？";

// XSearch 自动选择策略
const strategy = {
  provider: 'tavily',      // 无需 Token
  llmEnhancement: false,   // 不需要 LLM
  browser: false,          // 不需要浏览器
};

// 输出：结构化列表，零 Token 消耗
```

### 场景 2：动态网站内容提取（零 Token）

```typescript
// 用户查询
const query = "提取 https://example.com/news 的最新文章";

// 检测到动态网站
const strategy = {
  provider: 'headless',    // 使用无头浏览器
  actions: [
    { type: 'goto', url: 'https://example.com/news' },
    { type: 'scroll', behavior: 'human', times: 3 },
    { type: 'wait', for: 'networkidle' },
    { type: 'extract', selector: '.article-item' }
  ]
};

// 输出：提取的文章列表，零 Token 消耗
```

### 场景 3：复杂多源分析（可控 Token）

```typescript
// 用户查询
const query = "对比分析 React、Vue、Svelte 的性能特点和适用场景";

// 复杂场景，启用 LLM
const strategy = {
  provider: 'hybrid',
  stages: [
    { name: 'search', provider: 'tavily', llm: false },
    { name: 'extract', provider: 'headless', llm: false },
    { name: 'analyze', provider: 'llm', model: 'gpt-4', budget: 2000 },
    { name: 'visualize', type: 'comparison_table' }
  ]
};

// Token 预算控制
const budget = {
  max: 5000,
  warningAt: 4000,
  current: 0,  // 实时更新
};

// 输出：对比分析表 + 雷达图 + 推荐建议
```

### 场景 4：大规模批量搜索（分批次）

```typescript
// 用户查询
const query = "搜索过去一周关于 AI 芯片的所有新闻，并分析趋势";

// 批量任务配置
const batchConfig = {
  totalTasks: 100,
  batchSize: 10,
  parallel: 3,
  delayBetween: { min: 1000, max: 3000 },
  
  // Token 控制
  tokenBudget: {
    perBatch: 500,
    total: 5000,
    strategy: 'adaptive',  // 根据内容自动调整
  }
};

// 输出：趋势分析报告 + 时间线图 + 关键词云图
```

## 安装与配置

### 一键安装

```bash
# 作为 OpenClaw Skill 安装
opencode skill install xsearch

# 或通过 npm
npm install -g @xsearch/core
```

### 零配置使用

```typescript
// 开箱即用，无需配置
import { XSearch } from '@xsearch/core';

const search = new XSearch();
const result = await search.query("Python 3.12 新特性");
```

### 高级配置（可选）

```typescript
// xsearch.config.js
export default {
  // 搜索提供商配置
  providers: {
    tavily: {
      apiKey: process.env.TAVILY_API_KEY,  // 可选
    },
    browser: {
      engine: 'playwright',  // 或 'puppeteer'
      headless: true,
    }
  },
  
  // Token 预算
  tokenBudget: {
    default: 5000,
    warningThreshold: 0.8,
  },
  
  // 反爬虫设置
  antiCrawler: {
    userAgentRotation: true,
    proxyList: [],  // 可选
  },
  
  // 输出设置
  output: {
    stream: true,
    showProgress: true,
    visualization: true,
  }
};
```

## API 设计

### 核心 API

```typescript
class XSearch {
  // 简单查询
  async query(q: string, options?: QueryOptions): Promise<SearchResult>;
  
  // 批量查询
  async batch(queries: string[], options?: BatchOptions): Promise<BatchResult>;
  
  // 深度研究
  async research(topic: string, depth: ResearchDepth): Promise<ResearchReport>;
  
  // 对比分析
  async compare(items: string[], criteria: string[]): Promise<ComparisonResult>;
  
  // 监控/跟踪
  async track(url: string, changes: TrackOptions): Promise<TrackResult>;
}

// OpenClaw 集成
interface SkillContext {
  query: string;
  options?: SearchOptions;
  callback?: (progress: Progress) => void;
}

export const xsearchSkill = {
  name: 'xsearch',
  description: '智能搜索增强技能',
  
  async execute(context: SkillContext) {
    const search = new XSearch(context.options);
    return search.query(context.query, {
      onProgress: context.callback,
    });
  }
};
```

## 项目结构

```
xsearch/
├── src/
│   ├── core/
│   │   ├── XSearch.ts           # 主入口
│   │   ├── SearchEngine.ts      # 搜索引擎
│   │   ├── TokenManager.ts      # Token 管理
│   │   └── ProgressTracker.ts   # 进度追踪
│   │
│   ├── providers/
│   │   ├── InternalProvider.ts
│   │   ├── TavilyProvider.ts
│   │   ├── BrowserProvider.ts
│   │   └── LLMEnhancedProvider.ts
│   │
│   ├── browser/
│   │   ├── BrowserManager.ts
│   │   ├── engines/
│   │   │   ├── PlaywrightEngine.ts
│   │   │   ├── PuppeteerEngine.ts
│   │   │   └── LocalBrowserEngine.ts
│   │   └── strategies/
│   │       ├── AntiDetection.ts
│   │       ├── ScrollStrategy.ts
│   │       └── ExtractionStrategy.ts
│   │
│   ├── visualization/
│   │   ├── ChartEngine.ts
│   │   ├── TableRenderer.ts
│   │   ├── KnowledgeGraph.ts
│   │   └── templates/
│   │       ├── ComparisonTemplate.ts
│   │       ├── TimelineTemplate.ts
│   │       └── ResearchTemplate.ts
│   │
│   └── utils/
│       ├── RateLimiter.ts
│       ├── ProxyRotator.ts
│       └── ContentExtractor.ts
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── RECIPES.md
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── examples/
    ├── simple-search.ts
    ├── dynamic-extraction.ts
    ├── batch-research.ts
    └── visualization-demo.ts
```

## 技术栈

- **核心**: TypeScript / Node.js
- **浏览器引擎**: Playwright (默认) / Puppeteer / Selenium
- **HTTP 客户端**: Axios / Got
- **数据处理**: Cheerio (HTML解析) / Readability (内容提取)
- **可视化**: Mermaid / D3.js / Chart.js
- **测试**: Jest / Playwright Test

## 路线图

### Phase 1: MVP（核心功能）
- [ ] 基础搜索引擎（Tavily + Headless）
- [ ] Token 管理基础
- [ ] 简单进度展示
- [ ] OpenClaw Skill 集成

### Phase 2: 增强（高级功能）
- [ ] 多浏览器引擎支持
- [ ] 反爬虫策略完善
- [ ] 可视化图表生成
- [ ] 批量任务处理

### Phase 3: 完善（企业级）
- [ ] 知识图谱生成
- [ ] 智能模板系统
- [ ] 协作/分享功能
- [ ] 高级分析能力

## 贡献指南

欢迎提交 PR 和 Issue！详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT License - 内部开源项目
