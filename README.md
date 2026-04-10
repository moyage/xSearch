# xSearch

> A standard skill library for enhancing agent systems with advanced search capabilities.

[中文文档 (Chinese)](README_zh.md)

## What is xSearch?

xSearch is a **search enhancement skill** designed for AI agent systems. It provides structured, reliable access to external information with configurable providers, intelligent fallbacks, and token-aware processing.

Unlike traditional search wrappers, xSearch is built as a **reusable skill** that integrates seamlessly into agent workflows via the Model Context Protocol (MCP).

## Key Features

- **Multi-Provider Architecture**: Support for Tavily API, browser-based extraction, and internal search providers
- **Intelligent Fallback**: Automatic provider switching when primary methods fail
- **Token Budget Management**: Configurable limits with warnings to prevent context overflow
- **Progress Tracking**: Real-time progress reporting for long-running operations
- **MCP Native**: Standard MCP server for plug-and-play integration with Claude Desktop, Cursor, and other MCP-compatible agents
- **Anti-Detection**: Built-in strategies to handle common anti-crawler mechanisms

## Installation

```bash
npm install xsearch
```

### As an MCP Server

Add to your MCP configuration:

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

## Configuration

Create `xsearch.config.js` in your project root (optional):

```javascript
module.exports = {
  // Default provider: 'tavily' | 'apiHijacker' | 'browser'
  defaultProvider: 'tavily',
  
  // Tavily API (optional - only needed if using Tavily)
  tavilyApiKey: process.env.TAVILY_API_KEY,
  
  // Token budget configuration
  tokenBudget: {
    default: 5000,
    warningThreshold: 0.8
  },
  
  // Output options
  output: {
    stream: true,
    showProgress: true
  }
};
```

## Usage

### As a Library

```typescript
import { XSearch } from 'xsearch';

const search = new XSearch({
  defaultProvider: 'tavily',
  output: { stream: true }
});

const result = await search.query('Latest developments in quantum computing');
console.log(result.content);
```

### As an MCP Tool

Once configured as an MCP server, agents can invoke:

- `xsearch_search` - Standard search with query and options
- `xsearch_batch_search` - Multiple queries in parallel

See [AI_CALLING_GUIDE.md](./AI_CALLING_GUIDE.md) for detailed API schemas and error handling.

## Architecture

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

## API Reference

### Core Classes

- `XSearch` - Main entry point for search operations
- `SearchEngine` - Provider management and routing
- `TokenManager` - Budget tracking and limits
- `ProgressTracker` - Real-time operation progress

### Providers

- `TavilyProvider` - Tavily search API integration
- `ApiHijackerProvider` - Direct API endpoint access
- `BrowserEngine` - Headless browser extraction

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Build MCP server
npm run build:mcp
```

## Project Structure

```
xsearch/
├── src/
│   ├── core/           # Core engine (XSearch, SearchEngine, etc.)
│   ├── providers/      # Search providers (Tavily, ApiHijacker)
│   ├── browser/        # Browser automation components
│   ├── skills/         # Skill interface for agent integration
│   ├── utils/          # Utilities (AntiDetection, ContentExtractor)
│   └── v8/             # Autonomous search orchestration
├── dist/               # Compiled output
├── docs/               # Documentation
├── tests/              # Unit and integration tests
└── examples/           # Usage examples
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (for development)

## License

MIT

## Contributing

Contributions welcome. Please ensure changes align with the skill-based architecture and MCP protocol standards.
