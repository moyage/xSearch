#!/bin/bash
# XSearch 网页服务器启动脚本
# 支持本地访问和局域网访问

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 启动 XSearch 网页服务器...${NC}"

# 获取本机IP地址
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
fi

PORT=${1:-8080}

echo ""
echo -e "${GREEN}📡 服务器配置:${NC}"
echo "  本地访问: http://localhost:$PORT"
echo "  局域网访问: http://$IP_ADDRESS:$PORT"
echo ""

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  端口 $PORT 已被占用，尝试使用其他端口...${NC}"
    PORT=8081
    echo "  新端口: $PORT"
    echo "  本地访问: http://localhost:$PORT"
    echo "  局域网访问: http://$IP_ADDRESS:$PORT"
    echo ""
fi

echo -e "${GREEN}🌐 访问地址:${NC}"
echo "  • 本机:     http://localhost:$PORT"
echo "  • 局域网:   http://$IP_ADDRESS:$PORT"
echo ""
echo -e "${YELLOW}💡 提示: 按 Ctrl+C 停止服务器${NC}"
echo ""

# 启动服务器，绑定到所有网络接口
python3 -m http.server $PORT --bind 0.0.0.0
