import axios, { AxiosInstance } from 'axios';
import { SearchQuery, SearchResult, SearchOptions } from '../core/SearchEngine';

export interface TavilyConfig {
  apiKey?: string;
  baseUrl?: string;
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeAnswer?: boolean;
  includeImages?: boolean;
  includeRawContent?: boolean;
}

export class TavilyProvider {
  private client: AxiosInstance;
  private config: Required<TavilyConfig>;

  constructor(config: TavilyConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.TAVILY_API_KEY || '',
      baseUrl: config.baseUrl || 'https://api.tavily.com',
      maxResults: config.maxResults || 5,
      searchDepth: config.searchDepth || 'basic',
      includeAnswer: config.includeAnswer ?? true,
      includeImages: config.includeImages ?? false,
      includeRawContent: config.includeRawContent ?? false,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async search(query: SearchQuery, options: SearchOptions = {}): Promise<SearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Tavily API Key not configured. Set TAVILY_API_KEY environment variable or pass apiKey in config.');
    }

    try {
      options.onProgress?.(10);

      const response = await this.client.post('/search', {
        api_key: this.config.apiKey,
        query: query.query,
        max_results: this.config.maxResults,
        search_depth: this.config.searchDepth,
        include_answer: this.config.includeAnswer,
        include_images: this.config.includeImages,
        include_raw_content: this.config.includeRawContent,
      });

      options.onProgress?.(50);

      const data = response.data;
      
      const sources = data.results?.map((result: any) => ({
        title: result.title || 'Untitled',
        url: result.url,
        snippet: result.content || result.snippet || '',
        score: result.score,
        raw_content: result.raw_content,
      })) || [];

      options.onProgress?.(80);

      let content = '';
      
      if (data.answer) {
        content += `## 直接答案\n\n${data.answer}\n\n`;
      }

      if (sources.length > 0) {
        content += `## 搜索结果\n\n`;
        sources.forEach((source: any, index: number) => {
          content += `${index + 1}. **[${source.title}](${source.url})**\n`;
          content += `   ${source.snippet.substring(0, 200)}...\n\n`;
        });
      }

      if (data.images && data.images.length > 0) {
        content += `## 相关图片\n\n`;
        data.images.forEach((image: any) => {
          content += `- ![${image.description || 'Image'}](${image.url})\n`;
        });
      }

      options.onProgress?.(100);

      return {
        query: query.query,
        content,
        sources,
        metadata: {
          duration: 0,
          tokensUsed: { used: 0, cost: 0 },
          strategy: 'tavily',
        },
      };

    } catch (error: any) {
      if (error.response) {
        throw new Error(`Tavily API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async extract(url: string): Promise<{ title: string; content: string; links: string[] }> {
    if (!this.isConfigured()) {
      throw new Error('Tavily API Key not configured');
    }

    try {
      const response = await this.client.post('/extract', {
        api_key: this.config.apiKey,
        urls: [url],
        include_images: false,
        extract_depth: 'basic',
      });

      const result = response.data.results?.[0];
      
      if (!result) {
        throw new Error('No content extracted');
      }

      return {
        title: result.title || 'Untitled',
        content: result.raw_content || result.content || '',
        links: result.links || [],
      };

    } catch (error: any) {
      throw new Error(`Extraction failed: ${error.message}`);
    }
  }
}
