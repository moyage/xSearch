/**
 * 方案 C: API 逆向工程实施框架
 * 
 * 使用说明:
 * 1. 打开 Chrome DevTools (F12)
 * 2. 切换到 Network 标签
 * 3. 访问 https://skillsmp.com/
 * 4. 滚动页面，观察 XHR/Fetch 请求
 * 5. 寻找类似 /api/skills 或 /api/v1/skills 的请求
 * 6. 将发现的 API 信息填入下方配置
 * 7. 运行此脚本
 */

const axios = require('axios');
const fs = require('fs');

// ============================================
// TODO: 根据抓包结果填写以下配置
// ============================================
const API_CONFIG = {
  // API 基础 URL (从 Network 中获取)
  baseUrl: 'https://skillsmp.com/api',  // 示例，需要根据实际抓包修改
  
  // Skills 列表 API endpoint
  listEndpoint: '/skills',  // 示例：可能是 /api/skills 或 /graphql
  
  // 请求方法
  method: 'GET',  // 或 'POST'
  
  // 请求参数 (从实际请求中复制)
  params: {
    // 示例参数，需要根据实际抓包修改：
    // cursor: '',        // 分页游标
    // limit: 50,         // 每页数量
    // category: '',      // 分类过滤
    // sort: 'popular',   // 排序方式
  },
  
  // 请求头 (从实际请求中复制，可能需要 cookie/token)
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
    // 'Authorization': 'Bearer xxx',  // 如果需要认证
    // 'Cookie': 'session=xxx',        // 如果需要 cookie
  },
  
  // 响应数据结构 (根据实际响应调整)
  responseMapping: {
    itemsPath: 'data.items',      // 如: response.data.items
    nextCursorPath: 'data.nextCursor',  // 如: response.data.nextCursor
    totalPath: 'data.total',      // 如: response.data.total
  }
};

// 金融类关键词 (用于过滤)
const FINANCE_KEYWORDS = [
  'finance', 'financial', 'invest', 'investment', 'trading', 'stock', 'crypto',
  'bitcoin', 'ethereum', 'blockchain', 'banking', 'accounting', 'tax',
  'portfolio', 'forex', 'market', 'analysis', 'wealth', 'asset',
  '金融', '投资', '理财', '股票', '基金', '证券', '期货',
];

class ApiReverseEngineer {
  constructor(config) {
    this.config = config;
    this.results = [];
  }

  async fetchPage(cursor = null) {
    const params = { ...this.config.params };
    if (cursor) {
      params.cursor = cursor;
    }

    try {
      const response = await axios({
        method: this.config.method,
        url: `${this.config.baseUrl}${this.config.listEndpoint}`,
        params,
        headers: this.config.headers,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      console.error('API 请求失败:', error.message);
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('响应:', error.response.data);
      }
      throw error;
    }
  }

  async fetchAll() {
    console.log('🚀 开始 API 批量采集...');
    console.log(`   API: ${this.config.baseUrl}${this.config.listEndpoint}`);
    
    let cursor = null;
    let pageCount = 0;
    let hasMore = true;

    while (hasMore && pageCount < 1000) {  // 安全限制
      pageCount++;
      console.log(`\n📄 获取第 ${pageCount} 页...`);

      try {
        const data = await this.fetchPage(cursor);
        
        // 根据配置的映射提取数据
        const items = this.getNestedValue(data, this.config.responseMapping.itemsPath);
        const nextCursor = this.getNestedValue(data, this.config.responseMapping.nextCursorPath);
        const total = this.getNestedValue(data, this.config.responseMapping.totalPath);

        if (!items || items.length === 0) {
          console.log('   没有更多数据');
          break;
        }

        console.log(`   ✅ 获取 ${items.length} 个 Skills`);
        if (total) {
          console.log(`   📊 总计: ${total} 个`);
        }

        // 过滤金融类
        const financeItems = items.filter(item => {
          const text = JSON.stringify(item).toLowerCase();
          return FINANCE_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
        });

        console.log(`   💰 其中 ${financeItems.length} 个金融类`);
        this.results.push(...financeItems);

        // 检查是否有下一页
        cursor = nextCursor;
        hasMore = !!nextCursor;

        // 请求间隔，避免限流
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error('   ❌ 获取失败:', error.message);
        break;
      }
    }

    console.log(`\n✅ 采集完成！共获取 ${this.results.length} 个金融类 Skills`);
    return this.results;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  saveResults(filename = 'api-results.json') {
    const output = {
      timestamp: new Date().toISOString(),
      config: this.config,
      total: this.results.length,
      results: this.results,
    };

    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`💾 结果已保存: ${filename}`);
  }
}

// ============================================
// 使用示例和测试
// ============================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 API 逆向工程工具');
  console.log('='.repeat(80));
  
  console.log('\n⚠️  使用步骤:');
  console.log('   1. 打开 https://skillsmp.com/');
  console.log('   2. 按 F12 打开 DevTools → Network 标签');
  console.log('   3. 滚动页面，观察 XHR/Fetch 请求');
  console.log('   4. 找到 Skills 列表的 API 请求');
  console.log('   5. 复制请求的 URL、参数、Headers');
  console.log('   6. 修改上方 API_CONFIG 配置');
  console.log('   7. 运行: node api-reverse.js');
  
  console.log('\n📋 常见的 API 模式:');
  console.log('   • REST: /api/skills?cursor=xxx&limit=50');
  console.log('   • GraphQL: /graphql (查询 skills)');
  console.log('   • JSON-RPC: /api/v1 (method: getSkills)');
  console.log('   • Cursor Pagination: 使用 cursor 字段翻页');
  console.log('   • Offset Pagination: 使用 offset/limit 翻页');
  
  console.log('\n🔑 认证方式:');
  console.log('   • Cookie: 复制浏览器中的 Cookie');
  console.log('   • Token: Authorization: Bearer xxx');
  console.log('   • API Key: X-API-Key: xxx');
  console.log('   • 无认证: 直接访问');
  
  // 检查配置是否已填写
  if (API_CONFIG.baseUrl === 'https://skillsmp.com/api') {
    console.log('\n⚠️  请先根据抓包结果修改 API_CONFIG 配置！');
    console.log('   当前使用的是示例配置，需要替换为实际值。\n');
    return;
  }

  // 执行采集
  const crawler = new ApiReverseEngineer(API_CONFIG);
  await crawler.fetchAll();
  crawler.saveResults();
}

main().catch(console.error);

module.exports = { ApiReverseEngineer, API_CONFIG };
