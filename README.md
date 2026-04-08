# XSearch V6 (Protocol Hijacker)

**XSearch V6** has been completely reimagined from a "Headless Browser Scraper" to a **"Native API/MCP Protocol Hijacker"**. 

Designed natively for OpenClaw, NanoClaw, Hermes, and any MCP-compatible autonomous agents, xSearch bypasses Cloudflare walls, ignores deceptive pagination caps, and extracts structured data at microsecond latency with **zero-token cognitive overhead**.

## Why V6? (The Paradigm Shift)
*   **WAF Bypass**: No more dealing with `cf-mitigated: challenge` blocks by Playwright. xSearch connects via native HTTP/RPC and MCP (`@modelcontextprotocol/sdk`).
*   **Infinite Pagination Liar-Filter**: Many APIs lie about their `total` count to stop scrapers. XSearch probes until it receives an empty array, bypassing fake limits (e.g. turning 50 results into 1,800+).
*   **Rate-Limit Backpressure**: Built-in exponential backoff for `HTTP 429 Too Many Requests`. Never crash on a rate limit again.
*   **Extreme Complexity Budget**: Stripped of heavy browser kernels. Deploy instantly on Edge workers or Serverless.

## One-Click Installation

xSearch is packaged as a standard Skill for OpenClaw/NanoClaw. You can install it directly from the marketplace or git:

```bash
openclaw skill install github:moyage/xSearch
# OR locally
openclaw skill install /path/to/xSearch
```

## Agent Invocation (OHO Synergy)

In Hermes, OpenCode, or OpenClaw, simply invoke the skill with your extraction intent:

```typescript
task(
  skill='xsearch', 
  prompt='Extract all financial skills via API hijacker, bypass pagination limits'
)
```

## Manual Usage (Node.js)

```typescript
import { SearchEngine } from '@xsearch/core';

const engine = new SearchEngine({
  providers: {
    apiHijacker: {
      baseUrl: 'https://api.target.com/v1/search',
      authToken: process.env.API_KEY, // Optional Bearer
      paginationPath: 'data.pagination',
      resultsPath: 'data.items',
      hasNextField: 'hasNext'
    }
  }
});

const result = await engine.search({
  query: 'financial data',
  provider: 'apiHijacker' // Forces the 0-token high-speed pipeline
});

console.log(`Extracted ${result.content.length} deep-web items flawlessly.`);
```

## Architecture: OHO Paradigm & FinTec Agent Laws Compliant
This repository is strictly governed by the `labs-teamwork-spec` ruleset. All significant changes are prefaced by `vX.openspec.yaml` contracts and `ADR` documentation.
See `docs/ADR/002_v6_api_hijacker_shift.md` for the core design decisions.

## License
MIT
