import { XSearch, QueryOptions } from '../core/XSearch';

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

  async execute(context: { query: string; options?: QueryOptions }) {
    const search = new XSearch({
      output: {
        stream: true,
        showProgress: true,
        visualization: true,
      },
    });

    // 监听进度
    search.on('progress', (progress) => {
      console.log(`\n🔍 ${progress.taskName}`);
      console.log(`   进度: ${progress.percentage.toFixed(1)}%`);
      
      progress.stages.forEach((stage) => {
        const icon = stage.status === 'completed' ? '✓' : 
                     stage.status === 'running' ? '→' : '○';
        console.log(`   ${icon} ${stage.name}: ${stage.progress}%`);
      });
    });

    // 监听 Token 预警
    search.on('tokenWarning', (usage) => {
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
