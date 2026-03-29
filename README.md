# XSearch

智能搜索增强技能 - 为 OpenClaw 及类 Claw 系统提供强大的外部信息搜索、检索、分析和可视化能力。

## 核心特性

- **插件式安装**：一键安装，开箱即用
- **零配置启动**：简单场景无需配置，复杂场景灵活配置  
- **智能降级**：从"零Token"到"全功能"的无缝切换
- **搜索能力顶级**：应对从简单页面到复杂动态网站的各种场景
- **Token 控制**：预算管理、实时预警、智能降级
- **进度可视化**：流式输出、进度条、避免黑盒体验
- **结果可视化**：图表、知识图谱、信息图生成

## 快速开始

### 安装

```bash
git clone https://github.com/moyage/xSearch.git
cd xSearch
npm install
npm run build
npm link
```

### 基础使用

```typescript
import { XSearch } from '@xsearch/core';

const search = new XSearch();

// 简单查询（零 Token）
const result = await search.query("Python 3.12 新特性");
console.log(result.content);
```

### 高级使用

```typescript
// 批量搜索
const results = await search.batch(
  ["React 19", "Vue 3.4", "Svelte 5"],
  { batchSize: 3, parallel: 2 }
);

// 深度研究
const research = await search.research("AI Agent 发展趋势", "deep");

// 对比分析
const comparison = await search.compare(
  ["React", "Vue", "Svelte"],
  ["性能", "生态", "学习曲线"]
);
```

### OpenClaw 集成

```typescript
import { xsearchSkill } from '@xsearch/core/skills';

// 在 OpenClaw 中使用
task(skill='xsearch', prompt='搜索最新的前端框架趋势')
```

## 架构设计

详见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## License

MIT
