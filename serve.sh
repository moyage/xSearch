#!/bin/bash

# XSearch 网页服务器启动脚本
# 支持本地访问和外网访问

PROJECT_DIR="/Users/mlabs/Programs/xsearch"
LOCAL_PORT=8080
NGROK_PORT=8080

echo "🚀 XSearch 网页服务器启动工具"
echo "=============================="
echo ""

# 检查参数
if [ "$1" == "local" ]; then
    echo "📍 模式：本地访问"
    echo "🔗 地址：http://localhost:${LOCAL_PORT}"
    echo ""
    cd "$PROJECT_DIR"
    python3 -m http.server ${LOCAL_PORT} --bind 127.0.0.1

elif [ "$1" == "lan" ]; then
    echo "🏠 模式：局域网访问"
    # 获取本机IP
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    echo "🔗 地址：http://${IP}:${LOCAL_PORT}"
    echo ""
    cd "$PROJECT_DIR"
    python3 -m http.server ${LOCAL_PORT} --bind 0.0.0.0

elif [ "$1" == "ngrok" ]; then
    echo "🌐 模式：外网访问（ngrok）"
    
    # 检查 ngrok 是否安装
    if ! command -v ngrok &> /dev/null; then
        echo "❌ ngrok 未安装"
        echo ""
        echo "安装方式："
        echo "1. 访问 https://ngrok.com/download"
        echo "2. 下载并安装 ngrok"
        echo "3. 运行: ngrok authtoken YOUR_TOKEN"
        echo ""
        exit 1
    fi
    
    # 启动本地服务器（后台）
    echo "📡 启动本地服务器..."
    cd "$PROJECT_DIR"
    python3 -m http.server ${NGROK_PORT} --bind 127.0.0.1 &
    SERVER_PID=$!
    
    # 等待服务器启动
    sleep 2
    
    echo "🌍 启动 ngrok 隧道..."
    echo ""
    ngrok http ${NGROK_PORT}
    
    # ngrok 结束后关闭本地服务器
    kill $SERVER_PID 2>/dev/null

elif [ "$1" == "cloudflare" ]; then
    echo "☁️  模式：外网访问（Cloudflare Tunnel）"
    
    # 检查 cloudflared 是否安装
    if ! command -v cloudflared &> /dev/null; then
        echo "❌ cloudflared 未安装"
        echo ""
        echo "安装方式："
        echo "brew install cloudflared"
        echo ""
        exit 1
    fi
    
    echo "📡 启动本地服务器..."
    cd "$PROJECT_DIR"
    python3 -m http.server ${LOCAL_PORT} --bind 127.0.0.1 &
    SERVER_PID=$!
    
    sleep 2
    
    echo "🌍 启动 Cloudflare 隧道..."
    echo ""
    cloudflared tunnel --url http://localhost:${LOCAL_PORT}
    
    kill $SERVER_PID 2>/dev/null

else
    echo "使用方法："
    echo ""
    echo "  ./serve.sh local       # 仅本地访问（默认）"
    echo "  ./serve.sh lan         # 局域网访问"
    echo "  ./serve.sh ngrok       # 外网访问（需要 ngrok）"
    echo "  ./serve.sh cloudflare  # 外网访问（需要 cloudflared）"
    echo ""
    echo "示例："
    echo "  ./serve.sh local       # http://localhost:8080"
    echo "  ./serve.sh lan         # http://192.168.x.x:8080"
    echo "  ./serve.sh ngrok       # https://xxxx.ngrok.io"
    echo ""
fi
