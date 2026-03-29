const axios = require('axios');
const fs = require('fs');

const TAVILY_API_KEY = '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';
const TARGET_URL = 'https://skillsmp.com/';

// 金融类关键词
const FINANCE_KEYWORDS = [
  'finance', 'financial', 'invest', 'investment', 'trading', 'stock', 'crypto',
  'bitcoin', 'ethereum', 'blockchain', 'banking', 'accounting', 'tax',
  'budget', 'money', 'wealth', 'portfolio', 'forex', 'market', 'analysis',
  '金融', '投资', '理财', '股票', '加密货币', '银行', '会计', '税务',
  '预算', '财富', '交易', '市场', '分析', '基金', '证券', '期货'
];

// 分类定义
const CATEGORIES = {
  investment: {
    name: '投资管理',
    keywords: ['invest', 'portfolio', 'stock', 'fund', '基金', '投资', '理财', '组合', 'asset'],
  },
  trading: {
    name: '交易金融',
    keywords: ['trading', 'forex', 'crypto', 'bitcoin', '交易', '外汇', '加密货币', 'exchange'],
  },
  analysis: {
    name: '金融分析',
    keywords: ['analysis', 'analyst', 'research', '分析', '研究', 'data', 'analytics'],
  },
  banking: {
    name: '银行金融',
    keywords: ['banking', 'bank', 'loan', 'credit', '银行', '信贷', 'payment'],
  },
  accounting: {
    name: '会计税务',
    keywords: ['accounting', 'tax', 'audit', '会计', '税务', '审计', 'bookkeeping'],
  },
  blockchain: {
    name: '区块链/Web3',
    keywords: ['blockchain', 'web3', 'defi', 'nft', '区块链', 'smart contract', 'dao'],
  },
  insurance: {
    name: '保险',
    keywords: ['insurance', 'insure', '保险', 'risk management', 'actuarial'],
  },
  realestate: {
    name: '房地产金融',
    keywords: ['real estate', 'property', 'mortgage', '房地产', '房产'],
  },
  other: {
    name: '其他金融',
    keywords: ['finance', 'financial', 'money', 'wealth', 'economic', '金融', '财富'],
  },
};

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
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

function isFinanceSkill(text) {
  const lowerText = text.toLowerCase();
  return FINANCE_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
}

function categorizeSkill(text) {
  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [key, category] of Object.entries(CATEGORIES)) {
    scores[key] = category.keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
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
  };
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 XSearch Tavily API 测试');
  console.log('='.repeat(80));
  console.log(`\n📌 目标网站: ${TARGET_URL}`);
  console.log(`🎯 任务: 搜索金融类 Skills`);
  console.log(`🔑 API: Tavily`);

  try {
    // 1. 搜索网站概况
    console.log('\n' + '─'.repeat(80));
    console.log('📊 步骤 1: 获取网站概况');
    console.log('─'.repeat(80));

    const siteInfo = await searchWithTavily(
      `site:${TARGET_URL} what is this website about skills total count`,
      { depth: 'advanced', maxResults: 10 }
    );

    console.log(`\n✅ Tavily API 调用成功`);
    console.log(`   搜索结果数: ${siteInfo.results?.length || 0}`);
    console.log(`   回答: ${siteInfo.answer?.substring(0, 200) || 'N/A'}...`);

    // 2. 搜索金融类 Skills
    console.log('\n' + '─'.repeat(80));
    console.log('💰 步骤 2: 搜索金融类 Skills');
    console.log('─'.repeat(80));

    const searchQueries = [
      `site:${TARGET_URL} finance skill`,
      `site:${TARGET_URL} investment skill`,
      `site:${TARGET_URL} crypto trading skill`,
      `site:${TARGET_URL} blockchain skill`,
      `site:${TARGET_URL} financial analysis skill`,
      `site:${TARGET_URL} 金融 skill`,
      `site:${TARGET_URL} 投资 skill`,
    ];

    const allResults = [];

    for (let i = 0; i < searchQueries.length; i++) {
      const query = searchQueries[i];
      console.log(`\n🔍 查询 ${i + 1}/${searchQueries.length}: ${query}`);

      try {
        const result = await searchWithTavily(query, { depth: 'basic', maxResults: 20 });

        if (result.results) {
          console.log(`   ✅ 找到 ${result.results.length} 个结果`);

          for (const item of result.results) {
            if (item.url?.includes('skillsmp.com')) {
              const text = `${item.title} ${item.content}`;

              if (isFinanceSkill(text)) {
                const category = categorizeSkill(text);
                allResults.push({
                  title: item.title,
                  url: item.url,
                  content: item.content?.substring(0, 300),
                  rawContent: item.raw_content?.substring(0, 500),
                  ...category,
                });
              }
            }
          }
        }

        // 请求间隔，避免 rate limit
        if (i < searchQueries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.log(`   ❌ 查询失败: ${error.message}`);
      }
    }

    // 3. 去重
    const uniqueResults = [];
    const seenUrls = new Set();

    for (const result of allResults) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        uniqueResults.push(result);
      }
    }

    // 4. 统计分析
    console.log('\n' + '─'.repeat(80));
    console.log('📈 步骤 3: 统计分析');
    console.log('─'.repeat(80));

    console.log(`\n🔢 数据概览:`);
    console.log(`   总查询数: ${searchQueries.length}`);
    console.log(`   原始结果数: ${allResults.length}`);
    console.log(`   去重后结果数: ${uniqueResults.length}`);

    // 分类统计
    const categoryStats = {};
    for (const result of uniqueResults) {
      if (!categoryStats[result.category]) {
        categoryStats[result.category] = [];
      }
      categoryStats[result.category].push(result);
    }

    console.log(`\n📁 分类统计:`);

    const sortedCategories = Object.entries(categoryStats)
      .sort((a, b) => b[1].length - a[1].length);

    for (const [category, items] of sortedCategories) {
      const percentage = uniqueResults.length > 0
        ? ((items.length / uniqueResults.length) * 100).toFixed(1)
        : '0.0';
      console.log(`\n   📂 ${CATEGORIES[category].name}: ${items.length} 个 (${percentage}%)`);

      items.slice(0, 3).forEach((item, idx) => {
        console.log(`      ${idx + 1}. ${item.title}`);
      });

      if (items.length > 3) {
        console.log(`      ... 还有 ${items.length - 3} 个`);
      }
    }

    // 关键词统计
    console.log(`\n🏷️ 热门关键词:`);
    const keywordCounts = {};
    for (const result of uniqueResults) {
      const text = `${result.title} ${result.content}`.toLowerCase();
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
        console.log(`   ${idx + 1}. ${keyword}: ${count} 次`);
      });

    // 5. 保存结果
    const outputData = {
      timestamp: new Date().toISOString(),
      target: TARGET_URL,
      api: 'Tavily',
      queries: searchQueries.length,
      totalResults: allResults.length,
      uniqueResults: uniqueResults.length,
      categoryStats: Object.fromEntries(
        Object.entries(categoryStats).map(([k, v]) => [k, { count: v.length, items: v }])
      ),
      topKeywords: Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      results: uniqueResults,
    };

    const outputPath = '/Users/mlabs/Programs/xsearch/tavily-results.json';
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 结果已保存: ${outputPath}`);

    // 6. 差距分析
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  数据差距分析');
    console.log('='.repeat(80));
    console.log(`\n📊 实际数据:`);
    console.log(`   网站总 Skills: ~685,139`);
    console.log(`   金融类 Skills: ~1,000+`);
    console.log(`\n📊 本次采集:`);
    console.log(`   发现金融类 Skills: ${uniqueResults.length}`);
    console.log(`   覆盖率: ${((uniqueResults.length / 1000) * 100).toFixed(2)}%`);
    console.log(`\n🔍 原因分析:`);
    console.log(`   1. Tavily 只索引了网站部分内容`);
    console.log(`   2. 瀑布流动态加载内容未被索引`);
    console.log(`   3. 需要直接爬取才能获取完整数据`);
    console.log(`   4. 需要多页翻页和滚动加载采集`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Tavily API 测试完成');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

main();
