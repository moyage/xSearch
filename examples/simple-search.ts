/**
 * XSearch 简单搜索示例
 * 展示基础查询功能
 */

import { XSearch } from '../src/index';

async function simpleSearchExample() {
  console.log('=== XSearch 简单搜索示例 ===\n');
  
  const search = new XSearch();
  
  // 监听进度
  search.on('progress', (progress) => {
    console.log(`进度: ${progress.percentage.toFixed(1)}%`);
  });
  
  // 执行简单查询
  const result = await search.query('TypeScript 5.0 新特性', {
    complexity: 'low',
  });
  
  console.log('\n搜索结果:');
  console.log(result.content);
  console.log('\n元数据:', result.metadata);
}

simpleSearchExample().catch(console.error);
