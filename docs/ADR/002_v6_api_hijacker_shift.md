# ADR-002: xSearch V6 API/MCP Protocol Hijacker Shift

**Date**: 2026-04-08
**Status**: Accepted
**Author**: Hermes (Protocol Update)

## Context

The previous V5 and V8 architectures relied on DOM-based cognitive routing (Headless Browsers + LLM ARIA reasoning) to extract deep web data. In real-world stress testing (e.g., `skillsmp.com`), this approach suffered from:
1. Massive token consumption and latency per page.
2. Complete blockage by modern WAFs (Cloudflare `cf-mitigated: challenge`).
3. Total failure to scale over large paginated datasets (680,000+ items).

## Decision

We are abandoning the "Browser Visual Interaction" paradigm as the primary extraction method. We are replacing it with the **"V6 API/MCP Protocol Hijacker"** paradigm.

The core of `xSearch` will be decoupled and refactored into:
1. **Brain-Body Decoupling**: Removing Playwright/Puppeteer from the core bundle to reduce the complexity budget and dependency size. The browser engine will become an optional pluggable adapter, or completely replaced by MCP protocol connections.
2. **Native API/MCP Hijacking**: xSearch will preferentially look for `/mcp.json`, `.well-known/mcp.json`, or undocumented REST APIs, establishing direct RPC/HTTP tunnels.
3. **Pagination Lie Filter**: Overriding false `total` fields returned by APIs by implementing aggressive boundary-testing loops.
4. **Rate-Limit Backpressure**: Implementing sleep/resume logic upon encountering HTTP 429 Too Many Requests, rather than hard-failing.

## Expected Impact

- **Positive**: 0-token extraction loop, microsecond-level latency, WAF bypass via direct API/MCP interactions, perfect data coverage.
- **Negative**: xSearch will no longer work on purely static visual sites lacking APIs (though such sites are increasingly rare for large datasets).
- **Migration**: Major version bump to 6.0.0. Breakage of existing `OpenClawBrowserEngine` visual configurations.

## Resolution

Execute the V6 refactoring via Opencode, strictly following FinTec Agent Laws (L1 Schema-first, L2 Anti-drift).
