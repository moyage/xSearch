#!/bin/bash
# XSearch 外网访问配置脚本 (使用 ngrok)
# 一键安装 ngrok 并启动隧道

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🌐 XSearch 外网访问配置${NC}"
echo ""

# 检查 ngrok 是否已安装
if command -v ngrok &> /dev/null; then
    echo -e "${GREEN}✅ ngrok 已安装${NC}"
else
    echo -e "${YELLOW}📦 正在安装 ngrok...${NC}"
    
    # 检测操作系统
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ngrok/ngrok/ngrok
        else
            echo -e "${RED}❌ 请先安装 Homebrew: https://brew.sh${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
        echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
        sudo apt update && sudo apt install ngrok
    else
        echo -e "${RED}❌ 不支持的操作系统${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}🔑 配置 ngrok${NC}"
echo "  1. 访问 https://dashboard.ngrok.com/signup 注册账号"
echo "  2. 获取 Authtoken: https://dashboard.ngrok.com/get-started/your-authtoken"
echo ""

# 检查是否已配置 authtoken
if ! ngrok config check 2>&1 | grep -q "ERR_NGROK_302"; then
    echo -e "${GREEN}✅ ngrok 已配置${NC}"
else
    echo -e "${YELLOW}⚠️  需要配置 ngrok Authtoken${NC}"
    read -p "请输入你的 ngrok Authtoken: " AUTHTOKEN
    ngrok config add-authtoken $AUTHTOKEN
    echo -e "${GREEN}✅ Authtoken 已配置${NC}"
fi

echo ""
echo -e "${BLUE}🚀 启动 ngrok 隧道...${NC}"
echo ""
echo -e "${YELLOW}💡 提示: 按 Ctrl+C 停止服务${NC}"
echo ""

# 获取本地服务器端口
PORT=${1:-8080}

# 先启动本地服务器（后台）
echo -e "${BLUE}📡 启动本地服务器 (端口: $PORT)...${NC}"
python3 -m http.server $PORT --bind 0.0.0.0 &
SERVER_PID=$!

# 等待服务器启动
sleep 2

# 启动 ngrok
echo -e "${BLUE}🌐 启动 ngrok 隧道...${NC}"
ngrok http $PORT

# 清理
kill $SERVER_PID 2>/dev/null
