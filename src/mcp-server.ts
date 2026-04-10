import { ApiHijackerProvider, ApiHijackerConfig } from './providers/ApiHijackerProvider';
import { V8AutonomousSearchOrchestrator, V8AutonomousSearchConfig } from './v8/V8AutonomousSearchOrchestrator';
import { SearchQuery } from './core/SearchEngine';
import * as readline from 'readline';

// Server metadata
const SERVER_NAME = 'xsearch-mcp-server';
const SERVER_VERSION = '6.0.0';
const PROTOCOL_VERSION = '2024-11-05';

// JSON-RPC constants
const JSONRPC_VERSION = '2.0';

// Error codes
const ERROR_PARSE_ERROR = -32700;
const ERROR_INVALID_REQUEST = -32600;
const ERROR_METHOD_NOT_FOUND = -32601;
const ERROR_INVALID_PARAMS = -32602;
const ERROR_INTERNAL_ERROR = -32603;

/**
 * MCP Server implementation using JSON-RPC over stdio
 */
class XSearchMcpServer {
  private initialized = false;

  constructor() {
    this.setupStdioHandler();
  }

  private setupStdioHandler(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line: string) => {
      try {
        const message = JSON.parse(line);
        const response = await this.handleMessage(message);
        if (response) {
          console.log(JSON.stringify(response));
        }
      } catch (error: any) {
        // Parse error
        console.log(JSON.stringify({
          jsonrpc: JSONRPC_VERSION,
          id: null,
          error: {
            code: ERROR_PARSE_ERROR,
            message: `Parse error: ${error.message || String(error)}`,
          },
        }));
      }
    });

    rl.on('close', () => {
      process.exit(0);
    });

    // Log to stderr (not stdout - that's for JSON-RPC)
    console.error(`[${SERVER_NAME}] v${SERVER_VERSION} started`);
    console.error(`[${SERVER_NAME}] Protocol version: ${PROTOCOL_VERSION}`);
    console.error(`[${SERVER_NAME}] Available tools: xsearch_hijack_api, xsearch_autonomous_probe`);
  }

  private async handleMessage(message: any): Promise<any | null> {
    // Validate JSON-RPC version
    if (message.jsonrpc !== JSONRPC_VERSION) {
      return this.createError(message.id, ERROR_INVALID_REQUEST, 'Invalid JSON-RPC version');
    }

    // Handle notifications (no response needed)
    if (message.method && message.id === undefined) {
      await this.handleNotification(message.method, message.params);
      return null;
    }

    // Handle requests
    if (message.method) {
      return this.handleRequest(message.id, message.method, message.params);
    }

    return this.createError(message.id, ERROR_INVALID_REQUEST, 'Invalid request');
  }

  private async handleNotification(method: string, _params: any): Promise<void> {
    switch (method) {
      case 'notifications/initialized':
        this.initialized = true;
        console.error(`[${SERVER_NAME}] Client initialized`);
        break;
      default:
        // Unknown notification - ignore
        break;
    }
  }

  private async handleRequest(id: any, method: string, params: any): Promise<any> {
    switch (method) {
      case 'initialize':
        return this.handleInitialize(id, params);
      
      case 'tools/list':
        return this.handleToolsList(id);
      
      case 'tools/call':
        return this.handleToolsCall(id, params);
      
      default:
        return this.createError(id, ERROR_METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }

  private handleInitialize(id: any, params: any): any {
    console.error(`[${SERVER_NAME}] Initialize request from ${params?.clientInfo?.name || 'unknown client'}`);
    
    return {
      jsonrpc: JSONRPC_VERSION,
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: {
            listChanged: false,
          },
          logging: {},
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
        },
      },
    };
  }

  private handleToolsList(id: any): any {
    return {
      jsonrpc: JSONRPC_VERSION,
      id,
      result: {
        tools: [
          {
            name: 'xsearch_hijack_api',
            description: `Advanced API hijacking tool with pagination lie detection.
Bypasses false 'total' counts by probing until empty arrays are returned.
Handles HTTP 429 rate limits with exponential backoff.
Extracts structured data at high speed with zero DOM dependency.`,
            inputSchema: {
              type: 'object',
              properties: {
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for the API endpoint (e.g., https://api.example.com/v1)',
                },
                query: {
                  type: 'string',
                  description: 'Search query string',
                },
                authToken: {
                  type: 'string',
                  description: 'Optional Bearer token for authentication',
                },
                headers: {
                  type: 'object',
                  description: 'Optional custom headers to include in requests',
                  additionalProperties: { type: 'string' },
                },
                pageParam: {
                  type: 'string',
                  description: 'Query parameter name for pagination (default: "page")',
                  default: 'page',
                },
                limitParam: {
                  type: 'string',
                  description: 'Query parameter name for page size (default: "limit")',
                  default: 'limit',
                },
                resultsPath: {
                  type: 'string',
                  description: 'Dot-notation path to results array in response (default: "results")',
                  default: 'results',
                },
                paginationPath: {
                  type: 'string',
                  description: 'Dot-notation path to pagination object (default: "pagination")',
                  default: 'pagination',
                },
                totalField: {
                  type: 'string',
                  description: 'Field name for total count in pagination (default: "total")',
                  default: 'total',
                },
                hasNextField: {
                  type: 'string',
                  description: 'Field name indicating more results available (default: "has_next")',
                  default: 'has_next',
                },
                method: {
                  type: 'string',
                  enum: ['get', 'post'],
                  description: 'HTTP method to use (default: "get")',
                  default: 'get',
                },
                maxRetries: {
                  type: 'number',
                  description: 'Maximum retry attempts for rate-limited requests (default: 3)',
                  default: 3,
                },
                timeout: {
                  type: 'number',
                  description: 'Request timeout in milliseconds (default: 30000)',
                  default: 30000,
                },
              },
              required: ['baseUrl', 'query'],
            },
          },
          {
            name: 'xsearch_autonomous_probe',
            description: `Intelligent autonomous search using V8AutonomousSearchOrchestrator.
Performs query distillation, target reconnaissance, DOM interaction, and semantic reranking.
Automatically routes between API and DOM strategies based on target analysis.
Includes circuit breaker protection and comprehensive metrics.`,
            inputSchema: {
              type: 'object',
              properties: {
                targetUrl: {
                  type: 'string',
                  description: 'Target URL to search (e.g., https://example.com/search)',
                },
                query: {
                  type: 'string',
                  description: 'Complex natural language query to execute',
                },
                globalTimeout: {
                  type: 'number',
                  description: 'Global timeout in milliseconds (default: 120000)',
                  default: 120000,
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum results to return (default: 50)',
                  default: 50,
                },
              },
              required: ['targetUrl', 'query'],
            },
          },
        ],
      },
    };
  }

  private async handleToolsCall(id: any, params: any): Promise<any> {
    const { name, arguments: args } = params || {};

    if (!name) {
      return this.createError(id, ERROR_INVALID_PARAMS, 'Tool name is required');
    }

    try {
      let result: any;

      if (name === 'xsearch_hijack_api') {
        result = await this.handleHijackApi(args);
      } else if (name === 'xsearch_autonomous_probe') {
        result = await this.handleAutonomousProbe(args);
      } else {
        return this.createError(id, ERROR_INVALID_PARAMS, `Unknown tool: ${name}`);
      }

      return {
        jsonrpc: JSONRPC_VERSION,
        id,
        result: {
          content: result.content,
          ...(result.isError ? { isError: true } : {}),
        },
      };
    } catch (error: any) {
      return this.createError(id, ERROR_INTERNAL_ERROR, error.message || String(error));
    }
  }

  private async handleHijackApi(args: any): Promise<any> {
    const config: ApiHijackerConfig = {
      baseUrl: args.baseUrl,
      authToken: args.authToken,
      headers: args.headers,
      pageParam: args.pageParam,
      limitParam: args.limitParam,
      resultsPath: args.resultsPath,
      paginationPath: args.paginationPath,
      totalField: args.totalField,
      hasNextField: args.hasNextField,
      method: args.method,
      maxRetries: args.maxRetries,
      timeout: args.timeout,
    };

    const provider = new ApiHijackerProvider(config);
    
    const searchQuery: SearchQuery = {
      query: args.query,
      complexity: 'high',
      useLLM: false,
    };

    const result = await provider.search(searchQuery, {
      onProgress: (progress) => {
        console.error(`[xsearch_hijack_api] Progress: ${progress}%`);
      },
    });

    const metadata: Record<string, any> = result.metadata || {};
    const sources = result.sources || [];

    return {
      content: [
        {
          type: 'text',
          text: result.content,
        },
        {
          type: 'text',
          text: `\n---\n\n**Metadata:**\n- Duration: ${metadata.duration || 0}ms\n- Strategy: ${metadata.strategy || 'unknown'}\n- Total Fetched: ${metadata.totalFetched || 0}\n- Pages Fetched: ${metadata.pagesFetched || 0}\n- Sources: ${sources.length}`,
        },
      ],
    };
  }

  private async handleAutonomousProbe(args: any): Promise<any> {
    const config: V8AutonomousSearchConfig = {
      globalTimeout: args.globalTimeout,
    };

    const orchestrator = new V8AutonomousSearchOrchestrator(config);
    
    // Set up event listeners for progress
    orchestrator.on('start', () => {
      console.error('[xsearch_autonomous_probe] Search started');
    });
    
    orchestrator.on('distillation:complete', (result: any) => {
      console.error(`[xsearch_autonomous_probe] Query distilled: ${result.distilledKeywords.join(', ')}`);
    });
    
    orchestrator.on('reconnaissance:complete', (result: any) => {
      console.error(`[xsearch_autonomous_probe] Recon complete. Routing to: ${result.routingDecision}`);
    });
    
    orchestrator.on('dom:complete', (result: any) => {
      console.error(`[xsearch_autonomous_probe] DOM interaction complete. Success: ${result.success}`);
    });
    
    orchestrator.on('rerank:complete', (result: any) => {
      console.error(`[xsearch_autonomous_probe] Reranking complete. Kept: ${result.keptCount}/${result.totalCount}`);
    });

    const result = await orchestrator.search(args.targetUrl, args.query);

    const maxResults = args.maxResults ?? 50;
    const limitedResults = result.results.slice(0, maxResults);

    let output = `# Autonomous Search Results\n\n`;
    output += `**Query:** ${result.originalQuery}\n`;
    output += `**Distilled Keywords:** ${result.distilledKeywords.join(', ')}\n`;
    output += `**Routed To:** ${result.routedTo}\n`;
    output += `**Success:** ${result.success ? 'Yes' : 'No'}\n\n`;
    
    output += `## Metrics\n\n`;
    output += `- **Distillation Time:** ${result.metrics.distillationTime}ms\n`;
    output += `- **Reconnaissance Time:** ${result.metrics.reconnaissanceTime}ms\n`;
    output += `- **DOM Interaction Time:** ${result.metrics.domInteractionTime}ms\n`;
    output += `- **Rerank Time:** ${result.metrics.rerankTime}ms\n`;
    output += `- **Total Time:** ${result.metrics.totalTime}ms\n\n`;

    if (result.errors.length > 0) {
      output += `## Errors\n\n`;
      result.errors.forEach((error: string) => {
        output += `- ${error}\n`;
      });
      output += '\n';
    }

    output += `## Results (${limitedResults.length} of ${result.results.length})\n\n`;
    
    limitedResults.forEach((item: any, index: number) => {
      output += `${index + 1}. **[${item.title}](${item.url})**\n`;
      if (item.snippet) {
        output += `   ${item.snippet.substring(0, 200)}${item.snippet.length > 200 ? '...' : ''}\n`;
      }
      output += '\n';
    });

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  }

  private createError(id: any, code: number, message: string): any {
    return {
      jsonrpc: JSONRPC_VERSION,
      id: id ?? null,
      error: {
        code,
        message,
      },
    };
  }
}

// Start the server
new XSearchMcpServer();
