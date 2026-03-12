#!/bin/bash

echo "🧪 测试 macOS 桌面通知"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  请注意右上角的通知！"
echo ""
echo "发送测试通知..."
curl -X POST http://localhost:10010/api/analyze -s > /dev/null

echo "✅ 通知已发送！"
echo ""
echo "📍 请检查："
echo "   1. 屏幕右上角是否弹出通知"
echo "   2. 通知中心（点击右上角时钟旁边的图标）"
echo "   3. 系统偏好设置 → 通知 → 确认已允许通知"
echo ""
echo "🖱️  点击通知后会自动打开浏览器并跳转到 http://localhost:10010/review"
echo ""
