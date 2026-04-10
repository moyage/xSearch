# xSearch V6 (自主数据提取与协议劫持引擎)

[![Model Context Protocol](https://img.shields.io/badge/MCP-Native-green.svg)](#)
[![V8 Autonomous Orchestrator](https://img.shields.io/badge/V8-Orchestrator-blue.svg)](#)

[English Documentation](README.md)

**xSearch V6** 是下一代 API/MCP 协议劫持与自主数据提取引擎。它基于第一性原理为现代 AI 智能体设计，能够绕过 WAF 防火墙（如 Cloudflare `cf-mitigated` 挑战），无视欺骗性的分页上限，以微秒级延迟提取结构化数据，且对主智能体造成**零 Token 认知负担**。

## 🎯 解决的本质问题
传统的无头浏览器（如 Playwright）封装工具在服务于智能体时存在三大致命缺陷：
1. **WAF 拦截**: 浏览器自动化极易触发人机验证和反爬阻断。
2. **分页谎言**: 现代 API 通常在前端宣称只有 50 或 100 条数据以防抓取。
3. **上下文爆炸**: 将原始 HTML 或庞大的 DOM 树强塞给大模型，不仅耗费天量 Token，还会严重干扰模型的推理准确性。

xSearch V6 彻底抛弃了臃肿的浏览器内核依赖，转而使用原生 HTTP/RPC 协议劫持，并辅以本地自主编排引擎。

## 🏗 架构设计
- **协议劫持器 (Protocol Hijacker)**: 深度探测 API 接口。拦截后端请求，并通过内置的指数退避算法无缝处理 HTTP 429 限流。
- **无限分页探针 (Infinite Pagination Prober)**: 持续探测接口直到返回空数组，从而突破前端伪造的数据上限（例如将 50 条结果强制拉取到 1,800+ 条）。
- **V8 自主编排引擎 (V8 Autonomous Orchestrator)**: 一个内置的多阶段流水线，相当于一个子智能体：
  - **查询蒸馏 (Query Distillation)**: 将广泛的意图提炼为高精度的检索词。
  - **目标侦察 (Target Reconnaissance)**: 自主识别并嗅探最优的 API 端点。
  - **DOM 脱水 (DOM Dehydrator)**: 在必须降级使用浏览器时剔除噪音节点。
  - **语义重排 (Semantic Reranker)**: 在本地无 Token 消耗地完成重排，确保只将最高信噪比的数据返回给主 Agent。
- **通信协议**: 通过 `esbuild` 打包为零依赖的标准单文件 MCP Server (`@modelcontextprotocol/server`)。

## 🚀 核心特性
1. **原生 MCP 支持**: 通过 `dist/mcp.js`，瞬间接入 Cursor, Claude Desktop, OpenClaw 或 Hermes 体系。
2. **`xsearch_hijack_api`**: 智能体可直接调用的硬核工具，用于分页破解与批量结构化提取。
3. **`xsearch_autonomous_probe`**: 智能体只需提供宏观意图，底层 V8 引擎将全自动完成从提炼到重排的研究闭环。
4. **Token 预算管理器**: 当单次抓取量可能撑爆智能体上下文时，触发硬熔断或流式截断机制。

## 💻 典型业务场景
- **深度金融研报**: 穿透具有严密防护的交易平台，在不触发 403 的情况下拉取全量历史行情数据。
- **竞品目录抓取**: 刺透隐藏的 API 分页逻辑，毫秒级提取完整的竞品商品库 JSON。
- **智能体知识补全**: 当常规搜索（如 Tavily）因为网页结构过深或遇验证码失败时，xSearch 直接劫持底层协议拿取数据。

## 🛠 使用指南 (面向 AI 与人类)

### 安装与启动
```bash
npm install -g xsearch
# 启动为标准 MCP Server
npm run mcp
```
