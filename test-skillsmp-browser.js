/**
 * XSearch Playwright 测试：搜索 skillsmp.com 金融类 Skills
 */

const { chromium } = require('playwright');
const cheerio = require('cheerio');

const TARGET_URL = 'https://skillsmp.com/';

const FINANCE_KEYWORDS = [
  'finance', 'financial', 'invest', 'investment', 'trading', 'stock', 'crypto',
  'bitcoin', 'ethereum', 'blockchain', 'banking', 'accounting', 'tax',
  'budget', 'money', 'wealth', 'portfolio', 'forex', 'market', 'analysis',
  '金融', '投资', '理财', '股票', '加密货币', '银行', '会计', '税务',
  '预算', '财富', '交易', '市场', '分析'
];

const CATEGORIES = {
  investment: { name: '投资管理', keywords: ['invest', 'portfolio', 'stock', '基金', '投资', '理财'] },
  trading: { name: '交易金融', keywords: ['trading', 'forex', 'crypto', 'bitcoin', '交易', '外汇'] },
  analysis: { name: '金融分析', keywords: ['analysis', 'analyst', 'research', '分析', '研究'] },
  banking: { name: '银行金融', keywords: ['banking', 'bank', 'loan', '银行', '信贷'] },
  accounting: { name: '会计税务', keywords: ['accounting', 'tax', 'audit', '会计', '税务'] },
  blockchain: { name: '区块链/Web3', keywords: ['blockchain', 'web3', 'defi', 'nft', '区块链'] },
  other: { name: '其他金融', keywords: ['finance', 'financial', 'money', 'wealth', '金融', '财富'] },
};

async function fetchWithBrowser(url) {
  console.log(`🔍 启动浏览器访问: ${url}\n`);
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
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
    
    // 访问页面
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // 等待内容加载
    await page.waitForTimeout(5000);
    
    // 获取 HTML
    const html = await page.content();
    
    console.log('✅ 页面加载成功\n');
    
    return html;
    
  } finally {
    await browser.close();
  }
}

function extractSkills(html) {
  const $ = cheerio.load(html);
  const skills = [];
  
  // 多种选择器尝试
  const selectors = [
    '[data-skill]',
    '.skill',
    '.skill-item',
    '[class*="skill"]',
    'article',
    '.card',
    '.item',
    'a[href*="/skill/"]',
    'a[href*="/skills/"]',
    '.skill-card',
    '.skill-tile',
    '[data-testid*="skill"]',
  ];
  
  for (const selector of selectors) {
    $(selector).each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const title = $elem.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim() || text.substring(0, 100);
      const description = $elem.find('p, .description, [class*="desc"]').first().text().trim();
      const href = $elem.attr('href') || $elem.find('a').first().attr('href');
      
      if (title && title.length > 2 && !title.includes('http')) {
        skills.push({ title, description: description || text, href, selector });
      }
    });
    
    if (skills.length > 0) {
      console.log(`✅ 使用选择器 "${selector}" 找到 ${skills.length} 个 Skills\n`);
      break;
    }
  }
  
  // 如果常规选择器没找到，尝试提取所有链接文本
  if (skills.length === 0) {
    $('a').each((_, elem) => {
      const $a = $(elem);
      const text = $a.text().trim();
      const href = $a.attr('href');
      
      if (text && text.length > 3 && text.length < 100 && href && !href.startsWith('http')) {
        skills.push({ title: text, description: '', href, selector: 'fallback-link' });
      }
    });
  }
  
  // 去重
  const unique = [];
  const seen = new Set();
  
  for (const skill of skills) {
    const key = skill.title.toLowerCase();
    if (!seen.has(key) && skill.title.length > 3) {
      seen.add(key);
      unique.push(skill);
    }
  }
  
  return unique;
}

function isFinanceSkill(skill) {
  const text = `${skill.title} ${skill.description}`.toLowerCase();
  return FINANCE_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

function categorizeSkill(skill) {
  const text = `${skill.title} ${skill.description}`.toLowerCase();
  const scores = {};
  
  for (const [key, category] of Object.entries(CATEGORIES)) {
    scores[key] = category.keywords.filter(kw => text.includes(kw.toLowerCase())).length;
  }
  
  let bestCategory = 'other';
  let bestScore = scores.other;
  
  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = key;
    }
  }
  
  return { ...skill, category: bestCategory, categoryName: CATEGORIES[bestCategory].name };
}

function generateReport(financeSkills, allSkills) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 XSearch 测试报告：skillsmp.com 金融类 Skills 分析');
  console.log('='.repeat(80));
  console.log(`\n📌 数据概览:`);
  console.log(`  - 网站: https://skillsmp.com/`);
  console.log(`  - 总 Skills 数: ${allSkills.length}`);
  console.log(`  - 金融类 Skills: ${financeSkills.length}`);
  console.log(`  - 金融类占比: ${((financeSkills.length / allSkills.length) * 100).toFixed(1)}%`);
  
  if (financeSkills.length === 0) {
    console.log('\n⚠️ 未找到金融类 Skills');
    console.log('\n📋 所有 Skills 列表（前 20 个）:');
    allSkills.slice(0, 20).forEach((skill, idx) => {
      console.log(`  ${idx + 1}. ${skill.title}`);
    });
    return;
  }
  
  // 分类统计
  const categoryStats = {};
  for (const skill of financeSkills) {
    if (!categoryStats[skill.category]) {
      categoryStats[skill.category] = { count: 0, skills: [] };
    }
    categoryStats[skill.category].count += 1;
    categoryStats[skill.category].skills.push(skill);
  }
  
  console.log(`\n📈 分类统计:`);
  
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1].count - a[1].count);
  
  for (const [category, data] of sortedCategories) {
    const percentage = ((data.count / financeSkills.length) * 100).toFixed(1);
    console.log(`\n  📁 ${CATEGORIES[category].name}: ${data.count} 个 (${percentage}%)`);
    console.log(`  ${'─'.repeat(60)}`);
    
    data.skills.slice(0, 5).forEach((skill, idx) => {
      console.log(`  ${idx + 1}. ${skill.title}`);
      if (skill.description?.length > 10) {
        console.log(`     ${skill.description.substring(0, 80)}...`);
      }
    });
    
    if (data.skills.length > 5) {
      console.log(`     ... 还有 ${data.skills.length - 5} 个`);
    }
  }
  
  // 关键词统计
  console.log(`\n🏷️ 热门金融关键词:`);
  const keywordCounts = {};
  for (const skill of financeSkills) {
    const text = `${skill.title} ${skill.description}`.toLowerCase();
    for (const keyword of FINANCE_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }
  }
  
  Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([keyword, count], idx) => {
      console.log(`  ${idx + 1}. ${keyword}: ${count} 次`);
    });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 分析完成');
  console.log('='.repeat(80) + '\n');
  
  return { total: financeSkills.length, categories: categoryStats, keywords: keywordCounts };
}

async function main() {
  console.log('\n🚀 XSearch Playwright 测试开始\n');
  const startTime = Date.now();
  
  try {
    const html = await fetchWithBrowser(TARGET_URL);
    
    console.log('📄 正在提取 Skills...');
    const allSkills = extractSkills(html);
    console.log(`✅ 共提取到 ${allSkills.length} 个 Skills\n`);
    
    if (allSkills.length === 0) {
      console.log('⚠️ 未找到 Skills，显示页面片段:\n');
      const $ = cheerio.load(html);
      console.log($('body').text().substring(0, 1000));
      return;
    }
    
    console.log('💰 正在筛选金融类 Skills...');
    const financeSkills = allSkills.filter(isFinanceSkill);
    console.log(`✅ 找到 ${financeSkills.length} 个金融类 Skills\n`);
    
    console.log('📊 正在进行分类...');
    const categorizedSkills = financeSkills.map(categorizeSkill);
    
    const report = generateReport(categorizedSkills, allSkills);
    
    // 保存结果
    const fs = require('fs');
    const outputPath = '/Users/mlabs/Programs/xsearch/test-results.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      url: TARGET_URL,
      timestamp: new Date().toISOString(),
      totalSkills: allSkills.length,
      financeSkills: financeSkills.length,
      report,
      allSkills: allSkills.slice(0, 50),
      financeSkillsDetail: categorizedSkills,
    }, null, 2));
    console.log(`💾 结果已保存: ${outputPath}\n`);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  总耗时: ${duration} 秒\n`);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
