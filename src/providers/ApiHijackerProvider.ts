import axios, { AxiosInstance, AxiosError } from 'axios';
import { SearchQuery, SearchResult, SearchOptions } from '../core/SearchEngine';

export interface ApiHijackerConfig {
  /** Base URL for the API endpoint */
  baseUrl: string;
  /** Bearer token for authentication */
  authToken?: string;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
  /** Maximum number of retry attempts for rate-limited requests (429) */
  maxRetries?: number;
  /** Initial delay in ms before retrying (exponential backoff) */
  retryDelayMs?: number;
  /** Maximum delay between retries in ms */
  maxRetryDelayMs?: number;
  /** Timeout for HTTP requests in ms */
  timeout?: number;
  /** Query parameter name for pagination offset/page */
  pageParam?: string;
  /** Query parameter name for page size/limit */
  limitParam?: string;
  /** Field path in response containing results array (dot notation, e.g., 'data.results') */
  resultsPath?: string;
  /** Field path in response containing pagination info (dot notation, e.g., 'pagination') */
  paginationPath?: string;
  /** Field name containing total count in pagination object */
  totalField?: string;
  /** Field name indicating if there are more results */
  hasNextField?: string;
  /** HTTP method to use ('get' or 'post') */
  method?: 'get' | 'post';
  /** Function to build the request payload/query params */
  buildRequest?: (query: string, page: number, limit: number) => Record<string, any>;
}

export interface PaginatedApiResult {
  items: any[];
  hasNext: boolean;
  total?: number;
  page: number;
  limit: number;
}

/**
 * ApiHijackerProvider - Direct API hijacking with pagination lie filtering
 * 
 * Key features:
 * - Overrides false `total` fields by checking for empty arrays (boundary testing)
 * - Handles HTTP 429 (Too Many Requests) with exponential backoff retry
 * - Supports Bearer token authentication
 * - Configurable pagination parameters and response parsing
 * 
 * Direct API provider with pagination and rate limit handling
 */
export class ApiHijackerProvider {
  private client: AxiosInstance;
  private config: Required<ApiHijackerConfig>;

  constructor(config: ApiHijackerConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      authToken: config.authToken || '',
      headers: config.headers || {},
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      maxRetryDelayMs: config.maxRetryDelayMs ?? 30000,
      timeout: config.timeout ?? 30000,
      pageParam: config.pageParam ?? 'page',
      limitParam: config.limitParam ?? 'limit',
      resultsPath: config.resultsPath ?? 'results',
      paginationPath: config.paginationPath ?? 'pagination',
      totalField: config.totalField ?? 'total',
      hasNextField: config.hasNextField ?? 'has_next',
      method: config.method ?? 'get',
      buildRequest: config.buildRequest ?? this.defaultBuildRequest.bind(this),
    };

    const axiosConfig: any = {
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    };

    // Add Bearer token if provided
    if (this.config.authToken) {
      axiosConfig.headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    this.client = axios.create(axiosConfig);
  }

  /**
   * Default request builder - can be overridden via config
   */
  private defaultBuildRequest(query: string, page: number, limit: number): Record<string, any> {
    return {
      q: query,
      [this.config.pageParam]: page,
      [this.config.limitParam]: limit,
    };
  }

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.baseUrl;
  }

  /**
   * Sleep utility for rate limit backoff
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with 429 retry logic
   * Implements exponential backoff for rate-limited requests
   */
  private async makeRequestWithRetry(
    url: string,
    params?: Record<string, any>,
    data?: Record<string, any>,
    attempt: number = 0
  ): Promise<any> {
    try {
      const response = this.config.method === 'post'
        ? await this.client.post(url, data)
        : await this.client.get(url, { params });
      
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Handle HTTP 429 Too Many Requests
      if (axiosError.response?.status === 429) {
        if (attempt < this.config.maxRetries) {
          // Calculate exponential backoff delay
          const delay = Math.min(
            this.config.retryDelayMs * Math.pow(2, attempt),
            this.config.maxRetryDelayMs
          );
          
          console.warn(`[ApiHijacker] Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
          
          await this.sleep(delay);
          
          // Retry with incremented attempt counter
          return this.makeRequestWithRetry(url, params, data, attempt + 1);
        }
        
        throw new Error(`Rate limit exceeded after ${this.config.maxRetries} retries`);
      }
      
      // Re-throw non-429 errors
      throw error;
    }
  }

  /**
   * Extract nested value from object using dot notation path
   * e.g., getNestedValue(obj, 'data.results') -> obj.data.results
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Fetch a single page from the API
   */
  private async fetchPage(
    query: string,
    page: number,
    limit: number
  ): Promise<PaginatedApiResult> {
    const requestData = this.config.buildRequest(query, page, limit);
    
    const response = await this.makeRequestWithRetry(
      '/search',
      this.config.method === 'get' ? requestData : undefined,
      this.config.method === 'post' ? requestData : undefined
    );

    // Extract results using configured path
    const items = this.getNestedValue(response, this.config.resultsPath) || [];
    
    // Extract pagination info
    const pagination = this.getNestedValue(response, this.config.paginationPath) || {};
    const apiTotal = pagination[this.config.totalField];
    const apiHasNext = pagination[this.config.hasNextField];
    
    // PAGINATION LIE FILTER: Never trust API's total field blindly
    // Always check if the returned array is empty
    const isEmptyPage = !Array.isArray(items) || items.length === 0;
    
    // Determine if there are more results
    // Priority: 1) Empty page check (most reliable), 2) hasNext field, 3) total field comparison
    let hasNext: boolean;
    
    if (isEmptyPage) {
      // Empty array = definitely no more results (boundary reached)
      hasNext = false;
    } else if (apiHasNext !== undefined) {
      // Use explicit hasNext field if available
      hasNext = Boolean(apiHasNext);
    } else if (typeof apiTotal === 'number') {
      // Fall back to total count comparison (but log warning about potential lies)
      const estimatedTotal = page * limit + items.length;
      hasNext = estimatedTotal < apiTotal;
      
      if (hasNext && page > 1) {
        console.warn(`[ApiHijacker] Warning: Using potentially unreliable 'total' field (${apiTotal}). ` +
          `Consider using has_next field or verify API documentation.`);
      }
    } else {
      // No pagination info available - assume more results if we got a full page
      hasNext = items.length === limit;
    }

    return {
      items,
      hasNext,
      total: apiTotal,
      page,
      limit,
    };
  }

  /**
   * Perform deep pagination search with lie filtering
   * Continues fetching until an empty array is returned or max results reached
   */
  async search(
    query: SearchQuery,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    if (!this.isConfigured()) {
      throw new Error('ApiHijackerProvider not configured. Set baseUrl in config.');
    }

    const startTime = Date.now();
    const allItems: any[] = [];
    let currentPage = 1;
    const limit = 100; // Page size
    const maxResults = 10000; // Safety limit

    options.onProgress?.(10);

    try {
      // Deep pagination loop with boundary testing
      while (allItems.length < maxResults) {
        const pageResult = await this.fetchPage(query.query, currentPage, limit);
        
        // Add items to collection
        if (Array.isArray(pageResult.items) && pageResult.items.length > 0) {
          allItems.push(...pageResult.items);
        }
        
        console.log(`[ApiHijacker] Page ${currentPage}: fetched ${pageResult.items.length} items ` +
          `(total: ${allItems.length}, hasNext: ${pageResult.hasNext})`);
        
        // Progress update (scales from 10 to 90)
        const progressEstimate = Math.min(90, 10 + (allItems.length / 1000) * 80);
        options.onProgress?.(progressEstimate);
        
        // STOP CONDITION: Empty array returned (boundary reached)
        // This is the key defense against pagination lies
        if (pageResult.items.length === 0) {
          console.log(`[ApiHijacker] Empty page received at page ${currentPage}. Boundary reached.`);
          break;
        }
        
        // STOP CONDITION: API reports no more results
        if (!pageResult.hasNext) {
          console.log(`[ApiHijacker] API reports no more results at page ${currentPage}.`);
          break;
        }
        
        // STOP CONDITION: Max results safety limit
        if (allItems.length >= maxResults) {
          console.log(`[ApiHijacker] Max results limit (${maxResults}) reached.`);
          break;
        }
        
        currentPage++;
      }

      options.onProgress?.(95);

      // Format results
      const sources = allItems.slice(0, 100).map((item: any, index: number) => ({
        title: item.title || item.name || `Result ${index + 1}`,
        url: item.url || item.link || item.href || '',
        snippet: item.content || item.description || item.snippet || JSON.stringify(item).slice(0, 200),
      }));

      // Build content summary
      let content = `## API Search Results\n\n`;
      content += `Fetched ${allItems.length} total items across ${currentPage} page(s).\n\n`;
      
      if (sources.length > 0) {
        content += `### Top Results\n\n`;
        sources.forEach((source, index) => {
          content += `${index + 1}. **[${source.title}](${source.url})**\n`;
          if (source.snippet) {
            content += `   ${source.snippet.substring(0, 200)}${source.snippet.length > 200 ? '...' : ''}\n`;
          }
          content += '\n';
        });
      }

      options.onProgress?.(100);

      return {
        query: query.query,
        content,
        sources,
        metadata: {
          duration: Date.now() - startTime,
          tokensUsed: { used: 0, cost: 0 },
          strategy: 'api-hijacker',
          totalFetched: allItems.length,
          pagesFetched: currentPage,
        },
      };

    } catch (error: any) {
      if (error.response) {
        throw new Error(`API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Direct API fetch for a single endpoint (no pagination)
   * Useful for MCP-style endpoints or direct data access
   */
  async fetch(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('ApiHijackerProvider not configured');
    }

    const response = await this.makeRequestWithRetry(
      endpoint,
      this.config.method === 'get' ? params : undefined,
      this.config.method === 'post' ? params : undefined
    );

    return response;
  }

  /**
   * Update the Bearer token at runtime
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
    this.client.defaults.headers['Authorization'] = `Bearer ${token}`;
  }
}
