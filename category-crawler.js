/**
 * 方案 E: 分类页批量采集
 * 利用已知的分类页面 /categories/finance-investment 等
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// 已知的金融相关分类页
const CATEGORY_URLS = [
  'https://skillsmp.com/categories/finance-investment',
  'https://skillsmp.com/categories/finance',
  'https://skillsmp.com/categories/trading',
  'https://skillsmp.com/categories/blockchain',
  'https://skillsmp.com/categories/banking',
  'https://skillsmp.com/categories/accounting',
  'https://skillsmp.com/categories/insurance',
  'https://skillsmp.com/categories/real-estate',
  // 多语言版本
  'https://skillsmp.com/es/categories/finance',
  'https://skillsmp.com/ko/categories/finance',
  'https://skillsmp.com/de/categories/finance',
  'https://skillsmp.com/ja/categories/finance',
  'https://skillsmp.com/zh/categories/finance',
];

// 金融类关键词
const FINANCE_KEYWORDS = [
  'finance', 'financial', 'invest', 'investment', 'trading', 'stock', 'crypto',
  'bitcoin', 'ethereum', 'blockchain', 'banking', 'accounting', 'tax',
  'portfolio', 'forex', 'market', 'analysis', 'wealth', 'asset',
  '金融', '投资', '理财', '股票', '基金', '证券', '期货',
];

class CategoryCrawler {
  constructor() {
    this.results = [];
    this.visitedUrls = new Set();
  }

  async fetchCategoryPage(url) {
    try {
      console.log(`\n🔍 采集: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      const skills = this.extractSkills($, url);
      
      console.log(`   ✅ 发现 ${skills.length} 个 Skills`);
      return skills;

    } catch (error) {
      console.error(`   ❌ 失败: ${error.message}`);
      return [];
    }
  }

  extractSkills($, baseUrl) {
    const skills = [];
    
    // 尝试多种选择器
    const selectors = [
      'a[href*="/skills/"]',
      '.skill-item a',
      '[data-skill] a',
      'article a',
      '.card a',
    ];

    for (const selector of selectors) {
      $(selector).each((_, elem) => {
        const $a = $(elem);
        const href = $a.attr('href');
        const text = $a.text().trim();
        const title = $a.find('h1, h2, h3, h4, .title').text().trim() || text;
        
        if (href && href.includes('/skills/') && title) {
          const fullUrl = href.startsWith('http') ? href : `https://skillsmp.com${href}`;
          
          if (!this.visitedUrls.has(fullUrl)) {
            this.visitedUrls.add(fullUrl);
            
            const isFinance = FINANCE_KEYWORDS.some(kw => 
              (title + ' ' + text).toLowerCase().includes(kw.toLowerCase())
            );
            
            skills.push({
              title,
              url: fullUrl,
              text: text.substring(0, 200),
              source: baseUrl,
              isFinance,
            });
          }
        }
      });
      
      if (skills.length > 0) break;
    }

    return skills;
  }

  async crawlAll() {
    console.log('\n' + '='.repeat(80));
    console.log('📂 分类页批量采集');
    console.log('='.repeat(80));
    console.log(`\n🎯 目标: ${CATEGORY_URLS.length} 个分类页`);

    for (let i = 0; i < CATEGORY_URLS.length; i++) {
      const url = CATEGORY_URLS[i];
      console.log(`\n[${i + 1}/${CATEGORY_URLS.length}]`);
      
      const skills = await this.fetchCategoryPage(url);
      this.results.push(...skills);
      
      // 请求间隔
      if (i < CATEGORY_URLS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 统计
    const financeSkills = this.results.filter(s => s.isFinance);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 采集结果');
    console.log('='.repeat(80));
    console.log(`\n总发现: ${this.results.length} 个 Skills`);
    console.log(`金融类: ${financeSkills.length} 个`);
    console.log(`非金融: ${this.results.length - financeSkills.length} 个`);

    return {
      all: this.results,
      finance: financeSkills,
    };
  }

  saveResults() {
    const output = {
      timestamp: new Date().toISOString(),
      categories: CATEGORY_URLS,
      total: this.results.length,
      financeCount: this.results.filter(s => s.isFinance).length,
      results: this.results,
    };

    fs.writeFileSync('category-results.json', JSON.stringify(output, null, 2));
    console.log('\n💾 结果已保存: category-results.json');
  }
}

// 运行
async function main() {
  const crawler = new CategoryCrawler();
  await crawler.crawlAll();
  crawler.saveResults();
  
  console.log('\n✅ 分类页采集完成！');
  console.log('\n💡 提示: 如果结果被 Cloudflare 拦截，需要：');
  console.log('   1. 使用住宅代理');
  console.log('   2. 或使用 Playwright 浏览器');
}

main().catch(console.error);
