#!/bin/bash

echo "🚀 启动 claude-evolution Web UI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 停止已有服务器
echo "📌 检查端口 10010..."
if lsof -ti :10010 > /dev/null 2>&1; then
  echo "   停止已有服务器..."
  lsof -ti :10010 | xargs kill 2>/dev/null
  sleep 2
fi

# 启动服务器
echo "🔄 启动服务器..."
node web/server/dist/index.js > /tmp/claude-evolution-ui.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > /tmp/claude-evolution.pid

# 等待启动
sleep 3

# 检查服务器
if lsof -ti :10010 > /dev/null 2>&1; then
  echo "✅ 服务器启动成功 (PID: $SERVER_PID)"
else
  echo "❌ 服务器启动失败"
  cat /tmp/claude-evolution-ui.log
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 Web UI 已就绪！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 访问地址："
echo ""
echo "   🏠 Dashboard:  http://localhost:10010"
echo "   📋 Review:     http://localhost:10010/review"
echo "   ⚙️  Settings:   http://localhost:10010/settings"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 功能："
echo "   • 实时系统指标（每 30 秒刷新）"
echo "   • 桌面通知支持（点击自动跳转）"
echo "   • Neo-Brutalist 设计风格"
echo ""
echo "🛑 停止服务器："
echo "   kill $(cat /tmp/claude-evolution.pid)"
echo ""
echo "📝 查看日志："
echo "   tail -f /tmp/claude-evolution-ui.log"
echo ""

# 自动打开浏览器
if command -v open > /dev/null; then
  echo "🌐 正在打开浏览器..."
  sleep 1
  open http://localhost:10010
fi
