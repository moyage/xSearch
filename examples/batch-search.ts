/**
 * XSearch 批量搜索示例
 */

import { XSearch } from '../src/index';

async function batchSearchExample() {
  console.log('=== XSearch 批量搜索示例 ===\n');
  
  const search = new XSearch();
  const queries = [
    'React 19 新特性',
    'Vue 3.4 性能优化',
    'Svelte 5 运行时',
    'Angular 17 更新',
    'SolidJS 1.0 发布',
  ];
  
  console.log(`开始批量搜索 ${queries.length} 个查询...\n`);
  
  search.on('progress', (progress) => {
    console.log(`\r总体进度: ${progress.percentage.toFixed(1)}%`);
  });
  
  const startTime = Date.now();
  
  const results = await search.batch(queries, {
    batchSize: 2,
    parallel: 2,
    delayBetween: { min: 1000, max: 2000 },
    complexity: 'low', // 批量搜索使用低复杂度
  });
  
  const duration = Date.now() - startTime;
  
  console.log(`\n✅ 批量搜索完成！耗时: ${(duration / 1000).toFixed(2)}s\n`);
  
  results.forEach((result, index) => {
    console.log(`\n--- 查询 ${index + 1}: ${queries[index]} ---`);
    console.log(`内容长度: ${result.content.length} 字符`);
    console.log(`策略: ${result.metadata?.strategy}`);
  });
}

batchSearchExample().catch(console.error);
