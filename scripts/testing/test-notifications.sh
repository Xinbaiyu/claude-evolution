#!/bin/bash

echo "🧪 测试 claude-evolution 桌面通知功能"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BASE_URL="http://localhost:10010"

echo "1️⃣  测试分析完成通知（点击会跳转到 /review）"
curl -s -X POST "$BASE_URL/api/analyze" | jq '.data.message'
echo "   ✅ 通知已发送，请查看桌面通知并点击测试"
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 测试完成！"
echo ""
echo "📋 功能说明:"
echo "   • 点击桌面通知会自动打开浏览器"
echo "   • 根据通知类型跳转到不同页面:"
echo "     - 分析完成 → /review"
echo "     - 分析失败 → /dashboard"
echo "     - 新建议 → /review"
echo "     - 配置变更 → /settings"
echo "     - 系统错误 → /dashboard"
echo ""
echo "🔧 可用的通知类型:"
echo "   POST /api/analyze - 触发分析完成通知"
echo ""
