# 🌐 XSearch 网页访问配置指南

## 快速开始

### 方式一：本地 + 局域网访问（最简单）

```bash
# 赋予执行权限
chmod +x start-server.sh

# 启动服务器
./start-server.sh
```

访问地址：
- **本机**: http://localhost:8080
- **局域网**: http://你的IP:8080（同一WiFi下的其他设备可访问）

### 方式二：临时外网访问（使用 ngrok）

```bash
# 赋予执行权限
chmod +x start-ngrok.sh

# 一键安装并启动
./start-ngrok.sh
```

这会生成一个类似 `https://xxxx.ngrok-free.app` 的公网链接，任何人都可以访问。

### 方式三：永久外网访问（GitHub Pages - 推荐）

#### 步骤 1: 推送到 GitHub

```bash
# 在 xsearch 目录中初始化 git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库并推送
git remote add origin https://github.com/你的用户名/xsearch.git
git branch -M main
git push -u origin main
```

#### 步骤 2: 启用 GitHub Pages

1. 访问你的 GitHub 仓库页面
2. 点击 **Settings** → **Pages**
3. **Source** 选择 "Deploy from a branch"
4. **Branch** 选择 "main"，文件夹选择 "/ (root)"
5. 点击 **Save**

#### 步骤 3: 等待部署

- 约 1-2 分钟后，访问 `https://你的用户名.github.io/xsearch`
- 每次 push 代码后会自动重新部署

---

## 📋 详细说明

### 方案对比

| 方案 | 难度 | 成本 | 稳定性 | 适用场景 |
|------|------|------|--------|----------|
| **本地+局域网** | ⭐ 简单 | 免费 | 临时 | 开发测试、局域网分享 |
| **ngrok 隧道** | ⭐⭐ 中等 | 免费/付费 | 临时 | 临时外网演示、快速分享 |
| **GitHub Pages** | ⭐⭐ 中等 | 免费 | 永久 | 正式部署、长期可用 |
| **Vercel/Netlify** | ⭐⭐⭐ 稍复杂 | 免费 | 永久 | 需要自定义域名、更多功能 |

### 脚本说明

#### start-server.sh
- 自动检测本机IP
- 支持端口自动切换（如果8080被占用）
- 绑定到 0.0.0.0（所有网络接口）
- 显示本机和局域网访问地址

#### start-ngrok.sh
- 自动安装 ngrok（macOS/Linux）
- 引导配置 Authtoken
- 自动启动本地服务器
- 生成 HTTPS 公网链接

### 防火墙配置

如果局域网无法访问，可能需要关闭防火墙或开放端口：

**macOS:**
```bash
# 临时关闭防火墙（重启后恢复）
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

**Linux (Ubuntu/Debian):**
```bash
# 开放 8080 端口
sudo ufw allow 8080
```

---

## 🚀 高级选项

### 使用 Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

### 使用 Netlify 部署

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod --dir=.
```

### 自定义域名

在 GitHub Pages、Vercel 或 Netlify 的设置中添加自定义域名。

---

## 📱 访问方式总结

启动后，你可以通过以下方式访问页面：

1. **本机浏览器**: http://localhost:8080
2. **手机/平板**（同一WiFi）: http://你的电脑IP:8080
3. **外网访问**（ngrok）: https://xxx.ngrok-free.app
4. **永久链接**（GitHub Pages）: https://你的用户名.github.io/xsearch

---

## ❓ 常见问题

**Q: 为什么局域网无法访问？**
A: 检查防火墙设置，确保端口 8080 已开放。

**Q: ngrok 链接过期了怎么办？**
A: 免费版 ngrok 链接每次重启都会变化。需要固定链接请购买付费版或使用 GitHub Pages。

**Q: GitHub Pages 部署后样式丢失？**
A: 确保 `index.html` 中使用的路径是相对路径（如 `./style.css` 而非 `/style.css`）。

**Q: 如何停止服务器？**
A: 按 `Ctrl+C` 即可停止。
