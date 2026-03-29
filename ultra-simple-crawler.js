const { chromium } = require('playwright');
const fs = require('fs');

const TARGET_URL = 'https://skillsmp.com/categories/finance-investment';

async function ultraSimpleCrawler() {
  console.log('\n🚀 超简单浏览器采集 - 最后一试');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,  // 可见模式
  });

  try {
    const page = await browser.newPage();
    
    // 最简化的访问
    console.log('访问页面...');
    await page.goto(TARGET_URL, { timeout: 60000 });
    
    // 等待一下让内容加载
    await page.waitForTimeout(3000);
    
    // 简单滚动几次
    console.log('滚动页面...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(1000);
      console.log(`滚动 ${i + 1}/10`);
    }
    
    // 提取所有链接
    const links = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('a[href*="/skills/"]').forEach(a => {
        results.push({
          title: a.textContent?.trim().substring(0, 100) || '',
          href: a.getAttribute('href')
        });
      });
      return results;
    });
    
    console.log(`\n找到 ${links.length} 个 Skills`);
    
    // 保存
    fs.writeFileSync('ultra-simple-results.json', JSON.stringify(links, null, 2));
    console.log('结果已保存');
    
    return links.length;
    
  } catch (error) {
    console.error('错误:', error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

ultraSimpleCrawler();
