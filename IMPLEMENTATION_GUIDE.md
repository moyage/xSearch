# XSearch 深度采集实施指南

## 🎯 目标确认

- **网站**: https://skillsmp.com/
- **总 Skills**: 685,139 个
- **金融类 Skills**: 1,000+ 个 (人工确认)
- **当前进度**: 191 个 (19.1%)
- **差距**: 809 个 (80.9%)

---

## 🚀 三个实施方案

已为你准备三套代码，按推荐顺序执行：

### 方案 1: API 逆向工程 (推荐) ⭐

**文件**: `api-reverse.js`

**原理**: 抓包分析网站内部 API，直接调用获取数据

**优势**:
- 速度最快 (< 1 小时采集 1000+)
- 成本最低 (无需代理)
- 数据质量高 (结构化 JSON)

**适用场景**: 现代网站都有内部 API，成功率 80%

**实施步骤**:

1. **抓包分析 (30 分钟)**
   ```bash
   # 打开 Chrome
   open https://skillsmp.com/
   
   # 按 F12 → Network 标签
   # 滚动页面，观察 XHR/Fetch 请求
   # 寻找类似 /api/skills 的请求
   ```

2. **填写配置 (15 分钟)**
   ```javascript
   // 编辑 api-reverse.js
   const API_CONFIG = {
     baseUrl: 'https://skillsmp.com/api',  // 根据抓包修改
     listEndpoint: '/skills',               // 根据抓包修改
     method: 'GET',
     params: { limit: 50 },                 // 根据抓包修改
     headers: {},                           // 根据抓包修改
   };
   ```

3. **运行采集 (30 分钟)**
   ```bash
   node api-reverse.js
   ```

**预期结果**: 900-1000+ Skills (90%+ 覆盖)

---

### 方案 2: 分类页批量采集

**文件**: `category-crawler.js`

**原理**: 利用已知的分类页面 `/categories/finance-investment` 批量采集

**优势**:
- 无需抓包分析
- 速度快 (1-2 小时)
- 结构清晰

**适用场景**: 如果 API 难以破解，或作为补充方案

**实施步骤**:

1. **直接运行**
   ```bash
   node category-crawler.js
   ```

2. **如果被 Cloudflare 拦截**
   - 需要配置住宅代理
   - 或改用 Playwright 浏览器版本

**预期结果**: 300-500 Skills (30-50% 覆盖)

---

### 方案 3: 浏览器瀑布流采集 (保底)

**文件**: `src/browser/WaterfallCrawler.ts`

**原理**: Playwright 浏览器自动滚动，采集动态加载内容

**优势**:
- 最可靠，几乎适用于所有网站
- 可断点续传

**缺点**:
- 速度慢 (2-5 小时)
- 需要住宅代理 (~$50-100)
- 成本高

**适用场景**: 以上方案都失败时的兜底方案

**实施步骤**:

1. **配置住宅代理**
   ```javascript
   // 编辑 WaterfallCrawler.ts
   proxy: {
     server: 'http://residential-proxy:8080',
     username: 'your-username',
     password: 'your-password',
   }
   ```

2. **运行采集**
   ```bash
   npx ts-node examples/waterfall-crawler.ts
   ```

**预期结果**: 600-800 Skills (60-80% 覆盖)

---

## 📋 推荐执行顺序

### 今天立即执行

```bash
# Step 1: API 逆向 (30 分钟抓包 + 30 分钟采集)
# 成功率 80%，效果最好
node api-reverse.js

# 如果成功，你将获得 900-1000+ Skills ✅
```

### 如果 API 方案失败

```bash
# Step 2: 分类页采集 (1-2 小时)
# 作为补充，快速获取 300-500 Skills
node category-crawler.js

# 如果成功，你将获得 300-500 Skills ⚠️
```

### 如果以上都失败

```bash
# Step 3: 浏览器瀑布流 (2-5 小时)
# 保底方案，确保获得 600-800 Skills
# 需要配置住宅代理
npx ts-node examples/waterfall-crawler.ts

# 如果成功，你将获得 600-800 Skills ✅
```

---

## 💡 关键提示

### 1. 为什么 Tavily 只能找到 191 个？

**根本原因**:
- 搜索引擎只索引网站的 15-20% 内容
- 瀑布流动态加载的内容完全不在索引中
- 685k 数据量，搜索引擎不可能全量索引

**结论**: 要达到 1000+，**必须**使用直接采集方案

### 2. 为什么 API 逆向是最优方案？

**对比**:
| 方案 | 时间 | 成本 | 覆盖率 | 难度 |
|------|------|------|--------|------|
| Tavily API | 30 分钟 | $ | 20% | 低 |
| API 逆向 | 1 小时 | $ | 90% | 中 |
| 浏览器采集 | 5 小时 | $$$ | 70% | 中 |

**ROI**: API 逆向是 Tavily 的 **4.5 倍** 效率

### 3. 如何快速找到 API？

**Chrome DevTools 技巧**:
1. F12 → Network 标签
2. 筛选 XHR/Fetch
3. 滚动页面，观察新请求
4. 查看请求的 Response
5. 如果看到 JSON 数据，就是 API！

**常见 API 模式**:
```
/api/skills?cursor=xxx&limit=50
/api/v1/skills?page=2&category=finance
/graphql (查询 skills)
```

---

## 📊 预期结果

### 成功场景

**如果 API 逆向成功**:
```
采集数量: 900-1000+ Skills
覆盖率: 90%+
时间: < 1 小时
质量: 高 (结构化数据)
```

**如果分类页 + 浏览器组合**:
```
采集数量: 800-900 Skills
覆盖率: 80-90%
时间: 3-6 小时
质量: 中 (需要清洗)
```

### 失败场景应对

**如果 API 有认证/签名**:
- 复制浏览器的 Cookie/Token
- 或使用 Playwright 在浏览器环境中调用 API

**如果 Cloudflare 拦截严重**:
- 购买住宅代理 (推荐 Bright Data, Oxylabs)
- 使用浏览器方案 + 代理池

**如果网站完全无 API**:
- 使用 WaterfallCrawler
- 持续滚动 2-3 小时
- 断点续传，分批完成

---

## 🎯 下一步行动

### 今天 (立即执行)

1. **抓包分析** (30 分钟)
   ```bash
   open https://skillsmp.com/
   # F12 → Network → 滚动页面 → 找 API
   ```

2. **实施 API 逆向** (30 分钟)
   ```bash
   # 编辑 api-reverse.js 填入 API 信息
   node api-reverse.js
   ```

3. **验证结果**
   ```bash
   # 检查是否达到 1000+
   cat api-results.json | jq '.total'
   ```

### 如果今天未完成

**明天**: 继续分类页采集或浏览器方案

**本周内**: 确保达到 1000+ 目标

---

## 📞 技术支持

如果遇到问题：

1. **API 找不到**: 检查 Network 标签，筛选 XHR
2. **API 有认证**: 复制浏览器 Cookie 到 headers
3. **被 Cloudflare 拦截**: 使用住宅代理
4. **数据采集不全**: 检查分页参数 (cursor/page)

---

## ✅ 成功标准

**完成标志**:
- [ ] 采集到 1000+ 金融类 Skills
- [ ] 覆盖率达到 90%+
- [ ] 数据保存为 JSON 格式
- [ ] 分类统计清晰

**验收指标**:
```
目标: 1000+ Skills
当前: 191 Skills
差距: 809 Skills (80.9%)

成功: 达到 900+ (90%+ 覆盖)
优秀: 达到 1000+ (100% 覆盖)
```

---

**准备就绪！现在就开始实施吧！** 🚀

**推荐**: 先花 30 分钟抓包，找到 API 后 30 分钟就能完成 1000+ 采集！
