const { chromium } = require('playwright');
const fs = require('fs');

const TARGET_URL = 'https://skillsmp.com/categories/finance-investment';

const FINANCE_KEYWORDS = [
  'finance', 'financial', 'invest', 'investment', 'trading', 'stock', 'crypto',
  'bitcoin', 'ethereum', 'blockchain', 'banking', 'accounting', 'tax',
  'portfolio', 'forex', 'market', 'analysis', 'wealth', 'asset',
  '金融', '投资', '理财', '股票', '基金', '证券', '期货', '加密货币',
];

async function simpleScrollCrawler() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 简单浏览器滚动采集方案');
  console.log('='.repeat(80));
  console.log(`\n📌 目标: ${TARGET_URL}`);
  console.log('🎯 策略: 唤起浏览器 → 访问页面 → 循环滚动到底 → 提取所有Skills');
  console.log('⏱️  预期: 3分钟内完成\n');

  const startTime = Date.now();
  
  console.log('🔧 启动浏览器...');
  const browser = await chromium.launch({ 
    headless: false,  // 可见模式，模拟真实用户
    slowMo: 50,       // 稍微慢一点，更像人类
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // 注入反检测脚本
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ],
      });
    });

    // 访问金融分类页
    console.log('🌐 访问金融分类页面...');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ 页面加载完成\n');

    // 等待初始内容加载
    await page.waitForTimeout(5000);

    // 循环滚动到底部
    console.log('📜 开始滚动采集...');
    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);
    let scrollCount = 0;
    const allSkills = new Map();

    while (previousHeight !== currentHeight && scrollCount < 200) {
      scrollCount++;
      
      // 提取当前可见的Skills
      const skills = await page.evaluate((keywords) => {
        const results = [];
        const elements = document.querySelectorAll('a[href*="/skills/"]');
        
        elements.forEach(el => {
          const href = el.getAttribute('href');
          const text = el.textContent || '';
          const title = el.querySelector('h1, h2, h3, h4, .title')?.textContent || text;
          
          if (href && title) {
            const isFinance = keywords.some(kw => 
              (title + ' ' + text).toLowerCase().includes(kw.toLowerCase())
            );
            
            results.push({
              title: title.trim().substring(0, 100),
              url: href.startsWith('http') ? href : `https://skillsmp.com${href}`,
              text: text.trim().substring(0, 200),
              isFinance,
            });
          }
        });
        
        return results;
      }, FINANCE_KEYWORDS);

      // 保存到Map去重
      let newCount = 0;
      for (const skill of skills) {
        const key = skill.url;
        if (!allSkills.has(key)) {
          allSkills.set(key, skill);
          newCount++;
        }
      }

      // 显示进度
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   滚动 #${scrollCount}: +${newCount} 新 Skills | 总计: ${allSkills.size} | 时间: ${elapsed}s`);

      // 滚动到底部
      previousHeight = currentHeight;
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // 等待新内容加载
      await page.waitForTimeout(800);
      
      // 获取新高度
      currentHeight = await page.evaluate(() => document.body.scrollHeight);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 采集完成！');
    console.log('='.repeat(80));
    console.log(`\n📊 统计结果:`);
    console.log(`   总Skills: ${allSkills.size}`);
    console.log(`   金融类: ${Array.from(allSkills.values()).filter(s => s.isFinance).length}`);
    console.log(`   滚动次数: ${scrollCount}`);
    console.log(`   耗时: ${duration} 秒`);
    console.log(`   速度: ${(allSkills.size / duration * 60).toFixed(0)} 个/分钟`);

    // 保存结果
    const output = {
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      total: allSkills.size,
      duration: `${duration}s`,
      scrollCount,
      skills: Array.from(allSkills.values()),
    };

    fs.writeFileSync('simple-scroll-results.json', JSON.stringify(output, null, 2));
    console.log(`\n💾 结果已保存: simple-scroll-results.json`);

    // 显示前20个
    console.log(`\n📋 采集的Skills样本 (前20个):`);
    Array.from(allSkills.values()).slice(0, 20).forEach((skill, idx) => {
      console.log(`   ${idx + 1}. ${skill.title.substring(0, 60)}${skill.title.length > 60 ? '...' : ''}`);
    });

    if (allSkills.size > 20) {
      console.log(`   ... 还有 ${allSkills.size - 20} 个`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    return allSkills.size;

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// 运行
simpleScrollCrawler().catch(console.error);
