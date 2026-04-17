# xSearch Architecture Evolution Plan (Based on Scrapling & Jina Reader)

## 1. Context and Objective
`xSearch` is positioned as a **high-speed, zero-pollution web extraction and API/MCP hijacking engine** tailored for AI agents. 
To achieve "Layer-2/Layer-3 Orchestration Neutrality" (zero cognitive load for agents), xSearch must seamlessly bypass WAFs, dynamically adapt to DOM changes, and provide pure, LLM-native output formats (like Markdown). 

This document synthesizes architectural paradigms extracted from two cutting-edge tools:
1. **Scrapling** (Python): For its Underworld (Fetch, Bypass, Heal) mechanisms.
2. **Jina Reader** (Node.js): For its Overworld (LLM-Native Protocol, Content Distillation) API design.

---

## 2. Underworld: The Scrapling Paradigm (Bypass & Heal)

### 2.1 Hybrid TLS + CDP Escalation Pipeline
- **Problem**: Full headless browsers (Playwright) are memory-heavy and slow. 
- **Solution**: Implement a hybrid fetcher system.
  - **Tier 1 (Fast Track)**: Use Node.js TLS/JA3 spoofing (e.g., `got-scraping` or `curl-impersonate`) to fetch static pages.
  - **Tier 2 (Escalation)**: If a `403 Forbidden`, `429 Too Many Requests`, or `503 Service Unavailable` is encountered, xSearch should automatically transparently escalate the request to the `OpenClawBrowserEngine` (Playwright CDP).

### 2.2 Adaptive Parsing (Auto-Healing Selectors)
- **Problem**: DOM structures change frequently, breaking hardcoded CSS selectors.
- **Solution**: Implement an AST-based "Structural Signature" cache.
  - When a target node is first extracted, calculate a structural hash (tag name, class patterns, relative depth, parent/sibling hashes).
  - If a primary selector fails, execute a Levenshtein/Similarity scoring algorithm across the DOM to "guess" and repair the selector dynamically.

### 2.3 Physical WAF Bypass (Spatial-Click)
- **Problem**: Cloudflare Turnstile blocks automated traffic, and CAPTCHA APIs are slow.
- **Solution**: Inside `OpenClawBrowserEngine`, intercept Cloudflare challenges (`challenges.cloudflare.com`). Retrieve the `iframe` bounding box and use CDP `mouse.click(box.x + rand(20,30), box.y + rand(20,30))` to simulate physical jittered human clicks, instantly bypassing the WAF without third-party services.

---

## 3. Overworld: The Jina Reader Paradigm (LLM Output Protocol)

### 3.1 LLM-Native Content Distillation (Readability -> Markdown)
- **Problem**: Raw HTML DOMs burn token limits and confuse LLMs with noise (navs, footers, ads).
- **Solution**: Implement a robust Markdown conversion layer.
  - Strip `script`, `style`, `nav`, `footer`, and non-content elements.
  - Utilize Mozilla `Readability.js` (or a customized AST parser like Turndown) to extract ONLY the main article.
  - Output strict Markdown so the Agent can ingest it immediately without further cleaning.

### 3.2 Header-Driven Orchestration (Zero-Config API)
- **Problem**: Complex JSON configurations slow down Agent logic.
- **Solution**: xSearch should expose an API/MCP endpoint controlled entirely by HTTP Headers (inspired by Jina).
  - `X-Respond-With: markdown | html | text | screenshot` -> Direct format control.
  - `X-Target-Selector: .main-article` -> Bypasses auto-readability if a specific element is known.
  - `X-Wait-For-Selector: #data-loaded` -> Triggers SPA/dynamic rendering wait before extraction.
  - `X-With-Generated-Alt: true` -> Optional VLM captioning for images.

### 3.3 Seamless In-Site Search Integration
- **Problem**: Finding specific information inside a target domain.
- **Solution**: Implement a unified `s.xsearch.ai`-like endpoint. If an Agent queries `When was Jina AI founded? site=jina.ai`, xSearch uses Tavily/Google to fetch the top 5 URLs, then *automatically* pipes those 5 URLs through the `Read` pipeline to return a consolidated Markdown result.

---

## 4. Immediate Implementation Action Items for xSearch
1. Refactor `OpenClawBrowserEngine.ts` to include the **CDP Spatial-Click WAF bypass**.
2. Build `LLMDistiller.ts` (replacing the old `ContentExtractor.ts`) to implement Jina-style Markdown conversion.
3. Update `xsearchSkill.ts` and `mcp-server.ts` to support Header-driven modes (`X-Respond-With: markdown`).
