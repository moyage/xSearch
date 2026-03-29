# XSearch OpenClaw 安装指南

## 🚀 快速安装

### 方法 1: 直接安装 (推荐)

在 OpenClaw 中执行：

```bash
# 安装 XSearch Skill
git clone https://github.com/moyage/xSearch.git && cd xSearch && npm link

# 或者本地路径安装
cd /path/to/your/xSearch
npm link
```

### 方法 2: 通过 OpenClaw 配置

在 OpenClaw 配置文件中添加：

```json
{
  "skills": [
    {
      "name": "xsearch",
      "path": "/path/to/your/xSearch",
      "entry": "dist/skills/xsearchSkill.js"
    }
  ]
}
```

### 方法 3: 直接引用

在 OpenClaw 代码中：

```typescript
import { xsearchSkill } from '/path/to/your/xSearch/dist/skills/xsearchSkill';

// 使用 Skill
const result = await xsearchSkill.execute({
  query: '搜索 Python 3.12 新特性',
  options: {
    complexity: 'medium',
    maxTokens: 5000
  }
});
```

---

## ⚙️ 配置说明

### 环境变量

```bash
# Tavily API Key (可选，用于搜索增强)
export TAVILY_API_KEY='your-api-key'

# 默认搜索提供商
export XSEARCH_DEFAULT_PROVIDER='tavily'  # 或 'browser', 'hybrid'
```

### OpenClaw 配置

在 `~/.openclaw/config.json` 中添加：

```json
{
  "xsearch": {
    "tavilyApiKey": "your-api-key",
    "defaultProvider": "tavily",
    "output": {
      "stream": true,
      "showProgress": true,
      "visualization": true
    }
  }
}
```

---

## 📝 使用示例

### 基础搜索

```typescript
task(skill='xsearch', prompt='搜索最新的 React 19 新特性')
```

### 高级配置

```typescript
task(skill='xsearch', prompt='分析 Vue 和 React 的性能差异', {
  options: {
    complexity: 'high',
    maxTokens: 8000,
    outputFormat: 'table',
    useLLM: true
  }
})
```

### 批量搜索

```typescript
task(skill='xsearch', prompt='批量搜索：["Python 3.12", "TypeScript 5.0", "Rust 1.75"]')
```

### 深度研究

```typescript
task(skill='xsearch', prompt='深度研究 AI Agent 发展趋势', {
  options: {
    mode: 'research',
    depth: 'deep'
  }
})
```

---

## 🎯 使用场景

| 场景 | 命令示例 | 预期结果 |
|------|----------|----------|
| **快速查询** | `搜索什么是量子计算` | 简短答案 |
| **技术分析** | `对比分析 React vs Vue` | 对比表格 |
| **代码示例** | `查找 Python 异步编程最佳实践` | 代码片段 |
| **趋势研究** | `研究 2024 年前端技术趋势` | 详细报告 |
| **数据提取** | `提取 https://example.com 的技术栈` | 结构化数据 |

---

## 🔧 故障排除

### 问题 1: 找不到 Skill

```bash
# 检查安装
ls -la /path/to/your/xSearch/dist/

# 重新构建
cd /path/to/your/xSearch
npm run build
```

### 问题 2: 权限错误

```bash
# 修复权限
chmod +x /path/to/your/xSearch/dist/skills/xsearchSkill.js

# 或者使用 sudo
sudo npm link
```

### 问题 3: 依赖缺失

```bash
# 重新安装依赖
cd /path/to/your/xSearch
rm -rf node_modules
npm install
```

---

## 📊 性能优化

### 对于大规模采集 (>1000 结果)

建议在 OpenClaw 配置中启用：

```json
{
  "xsearch": {
    "browser": {
      "headless": true,
      "poolSize": 5
    },
    "rateLimit": {
      "requestsPerSecond": 2
    }
  }
}
```

### Token 控制

```typescript
task(skill='xsearch', prompt='你的查询', {
  options: {
    maxTokens: 3000,  // 限制 Token 消耗
    warningThreshold: 0.8  // 80% 时预警
  }
})
```

---

## 📚 更多信息

- **完整文档**: `/path/to/your/xSearch/docs/`
- **API 参考**: `/path/to/your/xSearch/docs/API.md`
- **示例代码**: `/path/to/your/xSearch/examples/`
- **架构设计**: `/path/to/your/xSearch/docs/ARCHITECTURE.md`

---

## ✅ 验证安装

安装完成后，运行验证：

```bash
# 测试基本功能
task(skill='xsearch', prompt='测试连接')

# 预期输出:
# ✅ XSearch 已就绪
# 📊 可用提供商: Tavily, Browser
# 🔍 准备搜索...
```

---

**安装完成！现在可以在 OpenClaw 中使用 XSearch 进行更多 case 的测试和验证。** 🎉
