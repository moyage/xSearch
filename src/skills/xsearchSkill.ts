import { XSearch, QueryOptions } from '../core/XSearch';

export interface OAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  authUrl?: string;
  tokenUrl?: string;
  scope?: string[];
}

export interface OAuthState {
  isAuthenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export class LocalOAuthManager {
  private config: OAuthConfig;
  private state: OAuthState = { isAuthenticated: false };
  private authServer?: any;

  constructor(config: OAuthConfig = {}) {
    this.config = {
      redirectUri: 'http://localhost:8765/oauth/callback',
      scope: ['openid', 'profile', 'email'],
      authUrl: 'https://oauth.example.com/authorize',
      tokenUrl: 'https://oauth.example.com/token',
      ...config,
    };
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated && 
           (!this.state.expiresAt || this.state.expiresAt > Date.now());
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId || '',
      redirect_uri: this.config.redirectUri || '',
      response_type: 'code',
      scope: (this.config.scope || []).join(' '),
      state: this.generateState(),
    });
    return `${this.config.authUrl}?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<boolean> {
    try {
      const response = await fetch(this.config.tokenUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.state = {
        isAuthenticated: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in 
          ? Date.now() + data.expires_in * 1000 
          : undefined,
      };

      return true;
    } catch {
      return false;
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.state.refreshToken) return false;

    try {
      const response = await fetch(this.config.tokenUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.state.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.state = {
        ...this.state,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.state.refreshToken,
        expiresAt: data.expires_in 
          ? Date.now() + data.expires_in * 1000 
          : this.state.expiresAt,
      };

      return true;
    } catch {
      return false;
    }
  }

  getAccessToken(): string | undefined {
    return this.state.accessToken;
  }

  logout(): void {
    this.state = { isAuthenticated: false };
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async startLocalAuthServer(port: number = 8765): Promise<void> {
    return new Promise((resolve) => {
      console.log(`OAuth local server would start on port ${port}`);
      console.log(`Auth URL: ${this.getAuthUrl()}`);
      resolve();
    });
  }
}

export const xsearchSkill = {
  name: 'xsearch',
  
  description: `
智能搜索增强技能 XSearch
提供强大的外部信息搜索、检索、分析和可视化能力

核心特性：
- 零配置开箱即用
- 智能降级策略（零Token到全功能）
- 支持简单搜索到复杂批量任务
- 多层级搜索提供商（Tavily、无头浏览器、内置搜索）
- 反爬虫对抗能力
- 流式进度展示
- Token 消耗控制
- 结果可视化

使用场景：
- 简单事实查询（零Token）
- 动态网站内容提取
- 多源对比分析
- 深度研究
- 大规模批量搜索
  `,

  oauth: new LocalOAuthManager(),

  async execute(context: { query: string; options?: QueryOptions }) {
    const search = new XSearch({
      output: {
        stream: true,
        showProgress: true,
        visualization: true,
      },
    });

    search.on('progress', (progress) => {
      console.log(`\n🔍 ${progress.taskName}`);
      console.log(`   进度: ${progress.percentage.toFixed(1)}%`);
      
      progress.stages.forEach((stage: any) => {
        const icon = stage.status === 'completed' ? '✓' : 
                     stage.status === 'running' ? '→' : '○';
        console.log(`   ${icon} ${stage.name}: ${stage.progress}%`);
      });
    });

    search.on('tokenWarning', (usage: any) => {
      console.log(`\n⚠️  Token 预警: 已使用 ${usage.used}/${usage.remaining}`);
    });

    const result = await search.query(context.query, context.options);

    return {
      content: result.content,
      sources: result.sources,
      visualization: result.visualization,
      metadata: result.metadata,
    };
  },
};

export default xsearchSkill;
