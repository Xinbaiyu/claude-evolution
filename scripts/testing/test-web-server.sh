#!/bin/bash

echo "🚀 启动 claude-evolution Web 服务器..."
cd "$(dirname "$0")"

# 启动服务器
node web/server/dist/index.js &
SERVER_PID=$!

# 等待启动
sleep 3

echo ""
echo "✅ 测试 API 端点:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "1️⃣  健康检查:"
curl -s http://localhost:10010/api/health | jq .

echo ""
echo "2️⃣  建议列表 (显示前 3 条):"
curl -s http://localhost:10010/api/suggestions | jq '.data[0:3] | .[] | {id: .id[0:8], type, status}'

echo ""
echo "3️⃣  前端页面:"
curl -s http://localhost:10010/ | grep -o "<title>.*</title>"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 测试完成！服务器运行在 http://localhost:10010"
echo ""
echo "按 Ctrl+C 停止服务器..."

# 等待用户中断
wait $SERVER_PID
