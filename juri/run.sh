#!/bin/bash
# 一键启动：本地代理（8766）+ 前端静态服务（8765）
# 用法：./run.sh       # 两个都起
#      ./run.sh api    # 只起代理
#      ./run.sh web    # 只起前端
set -e
cd "$(dirname "$0")"

MODE=${1:-all}

if [ "$MODE" = "all" ] || [ "$MODE" = "api" ]; then
  echo "==> 启动本地 RSS 代理 (端口 8766)..."
  python3 proxy.py --port 8766 &
  PROXY_PID=$!
  sleep 1
fi

if [ "$MODE" = "all" ] || [ "$MODE" = "web" ]; then
  echo "==> 启动前端静态服务 (端口 8765)..."
  python3 -m http.server 8765 &
  WEB_PID=$!
fi

echo ""
echo "=========================================="
echo "  法英选题工作台 已就绪"
echo "=========================================="
echo "  前端:  http://localhost:8765"
echo "  代理:  http://localhost:8766/proxy"
echo "=========================================="
echo "按 Ctrl+C 同时停止"
echo ""

trap 'echo ""; echo "停止中..."; kill $PROXY_PID $WEB_PID 2>/dev/null; exit 0' INT TERM
wait
