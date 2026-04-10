# xSearch

> 为各类 AI Agent 系统提供增强搜索能力的标准 Skills 技能库

[English Documentation](./README.md)

## 什么是 xSearch?

xSearch 是一个专为 AI Agent 系统设计的**搜索增强技能**。它通过可配置的搜索提供商、智能降级策略和 Token 感知处理，为外部信息提供结构化、可靠的访问能力。

不同于传统的搜索封装，xSearch 是作为**可复用技能**构建的，通过 Model Context Protocol (MCP) 无缝集成到 Agent 工作流中。

## 核心特性

- **多提供商架构**：支持 Tavily API、浏览器提取和内置搜索提供商
- **智能降级**：主方法失败时自动切换提供商
- **Token 预算管理**：可配置限制并预警，防止上下文溢出
- **进度追踪**：长时间操作的实时进度报告
- **MCP 原生**：标准 MCP 服务器，可与 Claude Desktop、Cursor 等兼容 MCP 的 Agent 即插即用
- **反检测**：内置策略应对常见反爬虫机制

## 安装

```bash
npm install xsearch
```

### 作为 MCP 服务器

添加到 MCP 配置：

```json
{
  "mcpServers": {
    "xsearch": {
      "command": "node",
      "args": ["path/to/xsearch/dist/mcp.js"]
    }
  }
}
```

## 配置

在项目根目录创建 `xsearch.config.js`（可选）：

```javascript
module.exports = {
  // 默认提供商: 'tavily' | 'apiHijacker' | 'browser'
  defaultProvider: 'tavily',
  
  // Tavily API（可选 - 仅在使用 Tavily 时需要）
  tavilyApiKey: process.env.TAVILY_API_KEY,
  
  // Token 预算配置
  tokenBudget: {
    default: 5000,
    warningThreshold: 0.8
  },
  
  // 输出选项
  output: {
    stream: true,
    showProgress: true
  }
};
```

## 使用方式

### 作为库使用

```typescript
import { XSearch } from 'xsearch';

const search = new XSearch({
  defaultProvider: 'tavily',
  output: { stream: true }
});

const result = await search.query('量子计算最新进展');
console.log(result.content);
```

### 作为 MCP 工具

配置为 MCP 服务器后，Agent 可以调用：

- `xsearch_search` - 带查询和选项的标准搜索
- `xsearch_batch_search` - 并行多查询

详细的 API Schema 和错误处理，请参见 [AI_CALLING_GUIDE.md](./AI_CALLING_GUIDE.md)。

## 架构

```
┌─────────────────────────────────────────┐
│           xSearch Core                  │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Search   │  │ Browser  │  │ Token  │ │
│  │ Engine   │  │ Engine   │  │ Manager│ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       └─────────────┴─────────────┘      │
│              Content Layer               │
│       ┌──────────┬──────────┐           │
│       │ Progress │ Visualization       │
│       │ Tracker  │ Engine              │
│       └──────────┴──────────┘           │
└─────────────────────────────────────────┘
```

## API 参考

### 核心类

- `XSearch` - 搜索操作的主入口
- `SearchEngine` - 提供商管理和路由
- `TokenManager` - 预算追踪和限制
- `ProgressTracker` - 实时操作进度

### 提供商

- `TavilyProvider` - Tavily 搜索 API 集成
- `ApiHijackerProvider` - 直接 API 端点访问
- `BrowserEngine` - 无头浏览器提取

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test

# 构建 MCP 服务器
npm run build:mcp
```

## 项目结构

```
xsearch/
├── src/
│   ├── core/           # 核心引擎 (XSearch, SearchEngine 等)
│   ├── providers/      # 搜索提供商 (Tavily, ApiHijacker)
│   ├── browser/        # 浏览器自动化组件
│   ├── skills/         # Agent 集成的技能接口
│   ├── utils/          # 工具 (AntiDetection, ContentExtractor)
│   └── v8/             # 自主搜索编排
├── dist/               # 编译输出
├── docs/               # 文档
├── tests/              # 单元和集成测试
└── examples/           # 使用示例
```

## 依赖要求

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (开发时)

## 许可证

MIT

## 贡献

欢迎提交 PR 和 Issue。请确保更改符合基于技能的架构和 MCP 协议标准。
