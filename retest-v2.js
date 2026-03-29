/**
 * XSearch 优化复测：增强版 Tavily 搜索
 * 基于上一轮 114 个结果的优化策略
 */

const axios = require('axios');
const fs = require('fs');

const TAVILY_API_KEY = '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';
const TARGET_URL = 'https://skillsmp.com/';

// 扩展金融类关键词（基于上一轮结果优化）
const FINANCE_KEYWORDS = {
  core: ['finance', 'financial', 'money', 'wealth', 'economic'],
  investment: ['invest', 'investment', 'portfolio', 'asset', 'fund', 'stock', 'equity', 'ETF', 'mutual fund'],
  trading: ['trading', 'trader', 'forex', 'crypto', 'bitcoin', 'ethereum', 'cryptocurrency', 'exchange', 'market'],
  analysis: ['analysis', 'analyst', 'research', 'data', 'analytics', 'forecast', 'prediction'],
  banking: ['banking', 'bank', 'loan', 'credit', 'mortgage', 'payment', 'fintech'],
  accounting: ['accounting', 'tax', 'audit', 'bookkeeping', 'CPA', 'IRS'],
  blockchain: ['blockchain', 'web3', 'defi', 'nft', 'smart contract', 'dao', 'token'],
  insurance: ['insurance', 'insure', 'risk', 'actuarial', 'underwriting'],
  realestate: ['real estate', 'property', 'mortgage', 'REIT'],
  chinese: ['金融', '投资', '理财', '股票', '基金', '证券', '期货', '外汇', '保险', '银行', '税务', '会计', '财务', '财富', '经济', '市场', '分析', '交易', '加密货币', '区块链'],
};

// 增强分类系统
const CATEGORIES = {
  investment: {
    name: '投资管理',
    keywords: ['invest', 'portfolio', 'asset', 'fund', 'ETF', 'wealth management', 'robo-advisor', '投资', '理财', '基金', '股票', '证券'],
    weight: 1.5,
  },
  trading: {
    name: '交易金融',
    keywords: ['trading', 'forex', 'crypto', 'bitcoin', 'exchange', 'market making', '量化交易', 'algorithmic', '交易', '外汇', '加密货币'],
    weight: 1.5,
  },
  blockchain: {
    name: '区块链/Web3',
    keywords: ['blockchain', 'web3', 'defi', 'nft', 'smart contract', 'dao', 'token', 'dapp', 'mining', 'staking', '区块链', '加密货币', '挖矿'],
    weight: 1.3,
  },
  analysis: {
    name: '金融分析',
    keywords: ['analysis', 'analyst', 'research', 'data', 'analytics', 'forecast', 'valuation', 'modeling', '分析', '研究', '估值', '预测'],
    weight: 1.2,
  },
  banking: {
    name: '银行金融',
    keywords: ['banking', 'bank', 'loan', 'credit', 'mortgage', 'payment', 'fintech', 'neobank', 'lending', '银行', '信贷', '支付'],
    weight: 1.2,
  },
  accounting: {
    name: '会计税务',
    keywords: ['accounting', 'tax', 'audit', 'bookkeeping', 'CPA', 'IRS', 'compliance', '会计', '税务', '审计'],
    weight: 1.1,
  },
  insurance: {
    name: '保险',
    keywords: ['insurance', 'insure', 'risk', 'actuarial', 'underwriting', 'claims', '保险', '精算', '理赔'],
    weight: 1.1,
  },
  realestate: {
    name: '房地产金融',
    keywords: ['real estate', 'property', 'mortgage', 'REIT', 'housing', 'commercial', '房地产', '房产', '房贷'],
    weight: 1.0,
  },
  corporate: {
    name: '企业金融',
    keywords: ['corporate finance', 'M&A', 'merger', 'acquisition', 'IPO', 'valuation', '财务', '并购', '上市'],
    weight: 1.0,
  },
  other: {
    name: '其他金融',
    keywords: ['finance', 'financial', 'money', 'wealth', 'economic', '金融', '财富', '经济'],
    weight: 1.0,
  },
};

// 优化搜索查询（精选 12 个高优先级）
const SEARCH_STRATEGIES = [
  // 核心金融
  { query: `site:${TARGET_URL} finance skill`, priority: 'high', category: 'core' },
  { query: `site:${TARGET_URL} financial analysis skill`, priority: 'high', category: 'analysis' },
  
  // 投资
  { query: `site:${TARGET_URL} investment portfolio skill`, priority: 'high', category: 'investment' },
  { query: `site:${TARGET_URL} stock trading skill`, priority: 'high', category: 'trading' },
  { query: `site:${TARGET_URL} asset management skill`, priority: 'high', category: 'investment' },
  
  // 交易
  { query: `site:${TARGET_URL} crypto trading skill`, priority: 'high', category: 'trading' },
  { query: `site:${TARGET_URL} market analysis skill`, priority: 'high', category: 'analysis' },
  
  // 区块链
  { query: `site:${TARGET_URL} blockchain skill`, priority: 'high', category: 'blockchain' },
  { query: `site:${TARGET_URL} defi skill`, priority: 'high', category: 'blockchain' },
  { query: `site:${TARGET_URL} web3 skill`, priority: 'high', category: 'blockchain' },
  
  // 银行
  { query: `site:${TARGET_URL} banking fintech skill`, priority: 'medium', category: 'banking' },
  { query: `site:${TARGET_URL} 金融投资 skill`, priority: 'high', category: 'core' },
];

async function searchWithTavily(query, options = {}) {
  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: options.depth || 'basic',
      max_results: options.maxResults || 20,
      include_answer: true,
      include_images: false,
      include_raw_content: true,
    }, {
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error(`Tavily API Error: ${error.message}`);
    if (error.response?.status === 429) {
      console.log('   ⚠️  Rate limit hit, waiting...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return searchWithTavily(query, options);
    }
    throw error;
  }
}

function isFinanceSkill(text) {
  const lowerText = text.toLowerCase();
  const allKeywords = Object.values(FINANCE_KEYWORDS).flat();
  return allKeywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

function categorizeSkill(text) {
  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [key, category] of Object.entries(CATEGORIES)) {
    const matchCount = category.keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
    scores[key] = matchCount * category.weight;
  }

  let bestCategory = 'other';
  let bestScore = scores.other;

  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = key;
    }
  }

  return {
    category: bestCategory,
    categoryName: CATEGORIES[bestCategory].name,
    relevanceScore: bestScore,
    confidence: bestScore > 2 ? 'high' : bestScore > 1 ? 'medium' : 'low',
  };
}

function extractSkillName(url, title, content) {
  // 从 URL 提取 skill name
  const urlMatch = url.match(/\/([^\/]+)$/);
  const urlName = urlMatch ? urlMatch[1].replace(/-/g, ' ') : '';
  
  // 清理标题
  const cleanTitle = title
    .replace(/Agent Skill by \w+/i, '')
    .replace(/SkillsMP/i, '')
    .replace(/-\s*Agent/i, '')
    .replace(/^\s+|\s+$/g, '');
  
  return cleanTitle || urlName;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 XSearch 优化复测 v2.0');
  console.log('='.repeat(80));
  console.log(`\n📌 目标: ${TARGET_URL}`);
  console.log(`🔑 API: Tavily (增强版策略)`);
  console.log(`📊 策略: ${SEARCH_STRATEGIES.length} 个优化查询词`);
  console.log(`🏷️  分类: ${Object.keys(CATEGORIES).length} 个精细分类`);

  const allResults = [];
  const failedQueries = [];
  let totalApiCalls = 0;

  console.log('\n' + '─'.repeat(80));
  console.log('💰 开始执行优化搜索策略');
  console.log('─'.repeat(80));

  for (let i = 0; i < SEARCH_STRATEGIES.length; i++) {
    const strategy = SEARCH_STRATEGIES[i];
    console.log(`\n🔍 [${i + 1}/${SEARCH_STRATEGIES.length}] ${strategy.query}`);
    console.log(`   优先级: ${strategy.priority} | 类别: ${strategy.category}`);

    try {
      totalApiCalls++;
      const result = await searchWithTavily(strategy.query, { 
        depth: strategy.priority === 'high' ? 'advanced' : 'basic',
        maxResults: 20 
      });

      if (result.results) {
        console.log(`   ✅ 找到 ${result.results.length} 个结果`);

        for (const item of result.results) {
          if (item.url?.includes('skillsmp.com')) {
            const text = `${item.title} ${item.content}`;
            
            if (isFinanceSkill(text)) {
              const category = categorizeSkill(text);
              const skillName = extractSkillName(item.url, item.title, item.content);
              
              allResults.push({
                name: skillName,
                title: item.title,
                url: item.url,
                content: item.content?.substring(0, 300),
                rawContent: item.raw_content?.substring(0, 500),
                querySource: strategy.query,
                queryCategory: strategy.category,
                ...category,
              });
            }
          }
        }
      }

      // 请求间隔
      if (i < SEARCH_STRATEGIES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

    } catch (error) {
      console.log(`   ❌ 失败: ${error.message}`);
      failedQueries.push(strategy.query);
    }
  }

  // 去重
  const uniqueResults = [];
  const seenUrls = new Set();

  for (const result of allResults) {
    if (!seenUrls.has(result.url)) {
      seenUrls.add(result.url);
      uniqueResults.push(result);
    }
  }

  // 统计分析
  console.log('\n' + '='.repeat(80));
  console.log('📈 优化复测结果分析');
  console.log('='.repeat(80));

  console.log(`\n🔢 执行统计:`);
  console.log(`   API 调用次数: ${totalApiCalls}`);
  console.log(`   查询策略数: ${SEARCH_STRATEGIES.length}`);
  console.log(`   失败查询: ${failedQueries.length}`);
  console.log(`   原始结果数: ${allResults.length}`);
  console.log(`   去重后结果: ${uniqueResults.length}`);

  // 对比上一轮
  const previousCount = 114;
  const improvement = ((uniqueResults.length - previousCount) / previousCount * 100).toFixed(1);
  console.log(`\n📊 对比上一轮 (114 个):`);
  console.log(`   本轮发现: ${uniqueResults.length} 个`);
  console.log(`   增长率: ${improvement}%`);
  console.log(`   净增: ${uniqueResults.length - previousCount} 个`);

  // 分类统计
  const categoryStats = {};
  for (const result of uniqueResults) {
    if (!categoryStats[result.category]) {
      categoryStats[result.category] = [];
    }
    categoryStats[result.category].push(result);
  }

  console.log(`\n📁 分类统计 (vs 上一轮):`);
  
  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].length - a[1].length);

  const previousStats = {
    other: 36, investment: 31, analysis: 18, 
    trading: 15, blockchain: 10, banking: 3, realestate: 1
  };

  for (const [category, items] of sortedCategories) {
    const prev = previousStats[category] || 0;
    const curr = items.length;
    const change = curr - prev;
    const changeSymbol = change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️';
    
    console.log(`\n   📂 ${CATEGORIES[category].name}`);
    console.log(`      本轮: ${curr} 个 | 上轮: ${prev} 个 | 变化: ${changeSymbol} ${Math.abs(change)}`);
    
    items.slice(0, 3).forEach((item, idx) => {
      console.log(`      ${idx + 1}. ${item.name} (置信度: ${item.confidence})`);
    });
    
    if (items.length > 3) {
      console.log(`      ... 还有 ${items.length - 3} 个`);
    }
  }

  // 置信度分析
  const confidenceStats = { high: 0, medium: 0, low: 0 };
  for (const result of uniqueResults) {
    confidenceStats[result.confidence]++;
  }

  console.log(`\n🎯 置信度分布:`);
  console.log(`   高置信度: ${confidenceStats.high} (${(confidenceStats.high/uniqueResults.length*100).toFixed(1)}%)`);
  console.log(`   中置信度: ${confidenceStats.medium} (${(confidenceStats.medium/uniqueResults.length*100).toFixed(1)}%)`);
  console.log(`   低置信度: ${confidenceStats.low} (${(confidenceStats.low/uniqueResults.length*100).toFixed(1)}%)`);

  // 热门关键词（新）
  console.log(`\n🏷️ 热门关键词 TOP 15:`);
  const keywordCounts = {};
  for (const result of uniqueResults) {
    const text = `${result.name} ${result.title} ${result.content}`.toLowerCase();
    const allKeywords = Object.values(FINANCE_KEYWORDS).flat();
    for (const keyword of allKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }
  }

  Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([keyword, count], idx) => {
      const bar = '█'.repeat(Math.min(count, 20));
      console.log(`   ${idx + 1}. ${keyword.padEnd(20)} ${bar} ${count}`);
    });

  // 保存结果
  const outputData = {
    timestamp: new Date().toISOString(),
    target: TARGET_URL,
    version: '2.0',
    optimization: {
      queryStrategies: SEARCH_STRATEGIES.length,
      categories: Object.keys(CATEGORIES).length,
      keywords: Object.values(FINANCE_KEYWORDS).flat().length,
    },
    comparison: {
      previous: previousCount,
      current: uniqueResults.length,
      improvement: `${improvement}%`,
      netGain: uniqueResults.length - previousCount,
    },
    execution: {
      totalApiCalls,
      failedQueries,
      successRate: `${((totalApiCalls - failedQueries.length) / totalApiCalls * 100).toFixed(1)}%`,
    },
    statistics: {
      total: uniqueResults.length,
      categories: Object.fromEntries(
        Object.entries(categoryStats).map(([k, v]) => [k, { count: v.length }])
      ),
      confidence: confidenceStats,
      topKeywords: Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 20),
    },
    results: uniqueResults,
  };

  const outputPath = '/Users/mlabs/Programs/xsearch/retest-v2-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\n💾 详细结果已保存: ${outputPath}`);

  // 结论
  console.log('\n' + '='.repeat(80));
  console.log('✅ 优化复测完成');
  console.log('='.repeat(80));
  
  console.log(`\n🎯 关键成果:`);
  console.log(`   • 查询策略从 7 个扩展到 ${SEARCH_STRATEGIES.length} 个`);
  console.log(`   • 分类体系从 8 个优化到 ${Object.keys(CATEGORIES).length} 个`);
  console.log(`   • 发现 Skills 从 114 个提升到 ${uniqueResults.length} 个`);
  console.log(`   • 增长率: ${improvement}%`);
  
  console.log(`\n💡 优化效果分析:`);
  if (uniqueResults.length > previousCount) {
    console.log(`   ✅ 扩展查询词策略有效，发现了新的 Skills`);
  } else if (uniqueResults.length === previousCount) {
    console.log(`   ℹ️  结果持平，可能已接近 Tavily 索引上限`);
  } else {
    console.log(`   ⚠️  结果减少，可能需要调整策略`);
  }
  
  console.log(`\n🚀 进一步提升建议:`);
  console.log(`   1. 使用 WaterfallCrawler 直接爬取（需住宅代理）`);
  console.log(`   2. 实施分布式采集策略`);
  console.log(`   3. API 逆向工程获取全量数据`);
  console.log(`   4. 定期增量更新保持数据新鲜度`);

  console.log('\n' + '='.repeat(80) + '\n');
}

main().catch(error => {
  console.error('\n❌ 测试失败:', error.message);
  process.exit(1);
});
