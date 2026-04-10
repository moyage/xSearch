# xSearch V6 (Autonomous Extraction Engine)

[![Model Context Protocol](https://img.shields.io/badge/MCP-Native-green.svg)](#)
[![V8 Autonomous Orchestrator](https://img.shields.io/badge/V8-Orchestrator-blue.svg)](#)

[中文文档 (Chinese)](README_zh.md)

**xSearch V6** is a next-generation API/MCP Hijacker and Autonomous Data Extraction Engine. Designed from first principles for modern AI Agents, it bypasses WAF walls (Cloudflare `cf-mitigated`), ignores deceptive pagination caps, and extracts structured data at microsecond latency with zero-token cognitive overhead.

## 🎯 The Problem It Solves
Traditional headless browser wrappers (e.g., Playwright) deployed for agents suffer from three fatal flaws:
1. **WAF Blocks**: Browser automation easily triggers Captchas and `cf-mitigated` challenges.
2. **Pagination Lies**: Modern APIs cap standard queries at 50 or 100 results to prevent scraping.
3. **Context Explosion**: Feeding raw HTML or massive DOM trees to LLMs consumes excessive tokens and degrades reasoning accuracy.

xSearch V6 solves this by completely dropping the heavy browser layer in favor of native HTTP/RPC hijacking, backed by a localized autonomous engine.

## 🏗 Architecture
- **Protocol Hijacker**: Deep API inspection. Intercepts backend requests and bypasses rate limits with built-in exponential backoff (HTTP 429).
- **Infinite Pagination Prober**: Probes endpoints sequentially until empty arrays are returned, effectively turning artificial 50-result limits into 1,800+ extractions.
- **V8 Autonomous Orchestrator**: An internal multi-stage pipeline acting as a sub-agent.
  - **Query Distillation**: Refines broad intents into targeted keywords.
  - **Target Reconnaissance**: Autonomously identifies the optimal API endpoint.
  - **DOM Dehydrator**: Strips out noise when falling back to browser mode.
  - **Semantic Reranker**: Performs local token-free sorting to ensure only high-signal data is returned to the main agent.
- **Protocol**: Single-file bundled standard MCP Server (`@modelcontextprotocol/server`).

## 🚀 Features
1. **MCP Native**: Plugs instantly into Cursor, Claude Desktop, OpenClaw, or Hermes via the `dist/mcp.js` zero-dependency bundle.
2. **`xsearch_hijack_api`**: Direct tool for agents to command pagination bypasses and bulk structured extractions.
3. **`xsearch_autonomous_probe`**: Agent provides a broad intent, and the V8 Orchestrator handles the complete research pipeline autonomously.
4. **Token Budget Manager**: Hard-stops operations if extractions threaten to overflow the agent's context window.

## 💻 Use Cases
- **Deep Financial Research**: Extracting historical market trends from heavily guarded trading platforms without hitting 403 blocks.
- **Competitor Analysis**: Probing hidden pagination APIs to scrape full product catalogs in milliseconds.
- **Agent Knowledge Augmentation**: When standard tools like Tavily fail due to deep structure or captchas, xSearch hijacks the internal API directly to retrieve the raw JSON.

## 🛠 Usage (For AI & Humans)

### Installation
```bash
npm install -g xsearch
# Start the MCP Server
npm run mcp
```

### AI Integration (MCP Tools)
- Call `xsearch_hijack_api` with `baseUrl`, `query`, and pagination parameters.
- Call `xsearch_autonomous_probe` for hands-off intent resolution.
