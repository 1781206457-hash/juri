#!/bin/bash
# 法律英语选题工作台 - 启动脚本
# 使用 Python 3 内置 HTTP 服务器提供静态文件服务
set -e
PORT=${1:-8765}
echo "=========================================="
echo "  法律英语选题工作台"
echo "  Legal English Topic Desk"
echo "=========================================="
echo ""
echo "正在启动本地服务器 (端口 $PORT) ..."
echo "启动后请在浏览器访问: http://localhost:$PORT"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "------------------------------------------"
cd "$(dirname "$0")"
python3 -m http.server "$PORT"
