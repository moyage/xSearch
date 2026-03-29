/**
 * XSearch 测试：搜索 skillsmp.com 金融类 Skills
 */

const axios = require('axios');
const cheerio = require('cheerio');

const TARGET_URL = 'https://skillsmp.com/';

// 金融类关键词
const FINANCE_KEYWORDS = [
  'finance', 'financial', 'invest', 'investment', 'trading', 'stock', 'crypto',
  'bitcoin', 'ethereum', 'blockchain', 'banking', 'accounting', 'tax',
  'budget', 'money', 'wealth', 'portfolio', 'forex', 'market', 'analysis',
  '金融', '投资', '理财', '股票', '加密货币', '银行', '会计', '税务',
  '预算', '财富', '交易', '市场', '分析'
];

// 分类定义
const CATEGORIES = {
  investment: {
    name: '投资管理',
    keywords: ['invest', 'investment', 'portfolio', 'stock', '基金', '投资', '理财', '组合'],
  },
  trading: {
    name: '交易金融',
    keywords: ['trading', 'forex', 'crypto', 'bitcoin', '交易', '外汇', '加密货币'],
  },
  analysis: {
    name: '金融分析',
    keywords: ['analysis', 'analyst', 'research', '分析', '研究'],
  },
  banking: {
    name: '银行金融',
    keywords: ['banking', 'bank', 'loan', 'credit', '银行', '信贷'],
  },
  accounting: {
    name: '会计税务',
    keywords: ['accounting', 'tax', 'audit', '会计', '税务', '审计'],
  },
  blockchain: {
    name: '区块链/Web3',
    keywords: ['blockchain', 'web3', 'defi', 'nft', '区块链'],
  },
  other: {
    name: '其他金融',
    keywords: ['finance', 'financial', 'money', 'wealth', '金融', '财富'],
  },
};

async function fetchPage(url) {
  console.log(`🔍 正在访问: ${url}\n`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      },
      timeout: 30000,
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ 访问失败: ${error.message}`);
    throw error;
  }
}

function extractSkills(html) {
  const $ = cheerio.load(html);
  const skills = [];
  
  // 尝试多种选择器来找到 Skills
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
  ];
  
  for (const selector of selectors) {
    $(selector).each((_, elem) => {
      const $elem = $(elem);
      
      // 提取文本内容
      const text = $elem.text().trim();
      const title = $elem.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim() || text.substring(0, 100);
      const description = $elem.find('p, .description, [class*="desc"]').first().text().trim();
      const href = $elem.attr('href') || $elem.find('a').first().attr('href');
      
      if (title && title.length > 2) {
        skills.push({
          title,
          description: description || text,
          href,
          source: selector,
        });
      }
    });
    
    if (skills.length > 0) break;
  }
  
  // 去重
  const unique = [];
  const seen = new Set();
  
  for (const skill of skills) {
    const key = skill.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(skill);
    }
  }
  
  return unique;
}

function isFinanceSkill(skill) {
  const text = `${skill.title} ${skill.description}`.toLowerCase();
  
  for (const keyword of FINANCE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

function categorizeSkill(skill) {
  const text = `${skill.title} ${skill.description}`.toLowerCase();
  const scores = {};
  
  // 为每个分类计算得分
  for (const [key, category] of Object.entries(CATEGORIES)) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    scores[key] = score;
  }
  
  // 找到得分最高的分类
  let bestCategory = 'other';
  let bestScore = scores.other;
  
  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = key;
    }
  }
  
  return {
    ...skill,
    category: bestCategory,
    categoryName: CATEGORIES[bestCategory].name,
    relevanceScore: bestScore,
  };
}

function generateReport(financeSkills) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 XSearch 测试报告：skillsmp.com 金融类 Skills 分析');
  console.log('='.repeat(80) + '\n');
  
  // 总体统计
  console.log(`🔢 总体统计:`);
  console.log(`  - 总 Skills 数: ${financeSkills.length}`);
  
  // 按分类统计
  const categoryStats = {};
  for (const skill of financeSkills) {
    if (!categoryStats[skill.category]) {
      categoryStats[skill.category] = {
        count: 0,
        skills: [],
      };
    }
    categoryStats[skill.category].count += 1;
    categoryStats[skill.category].skills.push(skill);
  }
  
  console.log(`\n📈 分类统计:`);
  
  // 按数量排序
  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].count - a[1].count);
  
  for (const [category, data] of sortedCategories) {
    const percentage = ((data.count / financeSkills.length) * 100).toFixed(1);
    console.log(`\n  📁 ${CATEGORIES[category].name} (${data.count} 个, ${percentage}%)`);
    console.log(`  ${'─'.repeat(60)}`);
    
    // 显示前 5 个 Skills
    data.skills.slice(0, 5).forEach((skill, idx) => {
      console.log(`  ${idx + 1}. ${skill.title}`);
      if (skill.description && skill.description.length > 10) {
        console.log(`     ${skill.description.substring(0, 80)}...`);
      }
    });
    
    if (data.skills.length > 5) {
      console.log(`     ... 还有 ${data.skills.length - 5} 个 Skills`);
    }
  }
  
  // 热门关键词
  console.log(`\n🏷️ 热门关键词:`);
  const keywordCounts = {};
  for (const skill of financeSkills) {
    const text = `${skill.title} ${skill.description}`.toLowerCase();
    for (const keyword of FINANCE_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }
  }
  
  const sortedKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedKeywords.forEach(([keyword, count], idx) => {
    console.log(`  ${idx + 1}. ${keyword}: ${count} 次`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 分析完成');
  console.log('='.repeat(80) + '\n');
  
  return {
    total: financeSkills.length,
    categories: categoryStats,
    keywords: keywordCounts,
    skills: financeSkills,
  };
}

async function main() {
  console.log('\n🚀 XSearch 测试开始\n');
  
  try {
    // 1. 获取页面
    const html = await fetchPage(TARGET_URL);
    
    // 2. 提取所有 Skills
    console.log('📄 正在提取 Skills...\n');
    const allSkills = extractSkills(html);
    console.log(`✅ 共提取到 ${allSkills.length} 个 Skills\n`);
    
    if (allSkills.length === 0) {
      console.log('⚠️ 未找到 Skills，显示页面内容片段:\n');
      const $ = cheerio.load(html);
      console.log($('body').text().substring(0, 500));
      return;
    }
    
    // 3. 筛选金融类 Skills
    console.log('💰 正在筛选金融类 Skills...\n');
    const financeSkills = allSkills.filter(isFinanceSkill);
    console.log(`✅ 找到 ${financeSkills.length} 个金融类 Skills\n`);
    
    if (financeSkills.length === 0) {
      console.log('⚠️ 未找到金融类 Skills，显示前 10 个 Skills:\n');
      allSkills.slice(0, 10).forEach((skill, idx) => {
        console.log(`${idx + 1}. ${skill.title}`);
      });
      return;
    }
    
    // 4. 分类
    console.log('📊 正在进行分类...\n');
    const categorizedSkills = financeSkills.map(categorizeSkill);
    
    // 5. 生成报告
    const report = generateReport(categorizedSkills);
    
    // 6. 导出 JSON
    const fs = require('fs');
    const outputPath = '/Users/mlabs/Programs/xsearch/test-results.json';
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`💾 详细结果已保存到: ${outputPath}\n`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

main();
