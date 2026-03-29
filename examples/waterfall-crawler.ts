/**
 * XSearch WaterfallCrawler 使用示例
 */

const { WaterfallCrawler } = require('./dist/browser/WaterfallCrawler');

async function waterfallExample() {
  console.log('\n' + '='.repeat(80));
  console.log('🌊 XSearch WaterfallCrawler 示例');
  console.log('='.repeat(80));
  
  const crawler = new WaterfallCrawler();
  
  // 监听事件
  crawler.on('browser:launched', () => {
    console.log('✅ 浏览器已启动');
  });
  
  crawler.on('crawl:started', (data) => {
    console.log(`\n🔍 开始爬取: ${data.url}`);
  });
  
  crawler.on('scroll:completed', (data) => {
    console.log(`   滚动 ${data.scrollNumber}: 发现 ${data.itemsFound} 个项目 (+${data.newItems} 新)`);
  });
  
  crawler.on('checkpoint:saved', (data) => {
    console.log(`   💾 检查点已保存: ${data.itemsCount} 个项目`);
  });
  
  crawler.on('crawl:stopped', (data) => {
    console.log(`\n⏹️  爬取停止: ${data.reason}`);
  });
  
  crawler.on('crawl:completed', (data) => {
    console.log(`\n✅ 爬取完成:`);
    console.log(`   总项目: ${data.totalItems}`);
    console.log(`   滚动次数: ${data.scrolls}`);
    console.log(`   耗时: ${(data.timeElapsed / 1000).toFixed(2)} 秒`);
  });
  
  try {
    // 注意：由于 skillsmp.com 有 Cloudflare 保护，这里用示例配置
    // 实际使用时需要配置代理和反爬策略
    
    console.log('\n⚠️  注意: 由于目标网站有 Cloudflare 保护，');
    console.log('   此示例展示 WaterfallCrawler 的使用方法。');
    console.log('   实际生产环境需要配置住宅代理和增强反爬策略。\n');
    
    /*
    // 实际使用代码（需要代理）：
    const items = await crawler.crawl('https://skillsmp.com/', {
      maxScrolls: 100,
      waitTime: 2000,
      scrollDelay: { min: 500, max: 1500 },
      extractSelector: '.skill-item, [data-skill], article',
      stopWhenNoNewContent: true,
      checkpointInterval: 10,
    });
    */
    
    console.log('📋 WaterfallCrawler 配置示例:');
    console.log(JSON.stringify({
      maxScrolls: 100,
      waitTime: 2000,
      scrollDelay: { min: 500, max: 1500 },
      extractSelector: '.skill-item, [data-skill], article',
      stopWhenNoNewContent: true,
      checkpointInterval: 10,
    }, null, 2));
    
    console.log('\n🎯 使用步骤:');
    console.log('   1. 配置住宅代理池');
    console.log('   2. 启动 WaterfallCrawler');
    console.log('   3. 设置合适的滚动次数和间隔');
    console.log('   4. 配置检查点保存频率');
    console.log('   5. 监控采集进度');
    
    console.log('\n💡 针对 skillsmp.com 的优化建议:');
    console.log('   - 使用 10+ 个住宅代理轮换');
    console.log('   - 每轮滚动 50-100 次');
    console.log('   - 滚动间隔 2-5 秒（随机）');
    console.log('   - 每 10 次滚动保存检查点');
    console.log('   - 预期采集时间: 2-5 小时');
    console.log('   - 预期覆盖率: 70-90%');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await crawler.close();
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 示例完成');
  console.log('='.repeat(80) + '\n');
}

waterfallExample();
