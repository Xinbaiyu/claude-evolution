#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 macOS 通知诊断工具"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 检查系统版本
echo "1️⃣  系统信息："
sw_vers | grep "ProductVersion"
echo ""

# 2. 测试简单通知
echo "2️⃣  测试 AppleScript 通知（更底层）："
echo "   发送测试通知..."
osascript -e 'display notification "这是一条测试通知\n如果您看到了，说明通知系统正常工作" with title "通知测试" subtitle "来自 Claude Evolution" sound name "default"'
echo "   ✅ AppleScript 通知已发送"
echo "   ❓ 您看到右上角的通知了吗？"
echo ""
sleep 3

# 3. 检查通知中心历史
echo "3️⃣  检查通知中心："
echo "   请手动检查："
echo "   → 点击屏幕右上角的时钟/日期"
echo "   → 打开通知中心"
echo "   → 查看是否有 'Node' 或 '脚本编辑器' 的通知"
echo ""

# 4. 权限检查指南
echo "4️⃣  权限设置指南："
echo "   如果没看到通知，请检查："
echo ""
echo "   📍 路径：系统偏好设置 → 通知"
echo ""
echo "   查找以下应用："
echo "   • Terminal（终端）"
echo "   • Node"
echo "   • Script Editor（脚本编辑器）"
echo ""
echo "   确保启用："
echo "   ✅ 允许通知"
echo "   ✅ 在通知中心显示"
echo "   ✅ 横幅样式（推荐）或提醒"
echo "   ✅ 播放声音"
echo ""

# 5. 发送 node-notifier 通知
echo "5️⃣  测试 node-notifier 通知："
echo "   发送通知..."
curl -X POST http://localhost:10010/api/analyze 2>/dev/null | jq -r '.data.message'
echo ""
echo "   等待 15 秒观察通知..."
sleep 15
echo ""

# 6. 查看日志
echo "6️⃣  服务器日志："
tail -10 /tmp/notification-test.log | grep "Notification"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 诊断总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 如果看到 AppleScript 测试通知："
echo "   → 说明系统通知功能正常"
echo "   → 问题可能在于 node-notifier 的权限"
echo "   → 需要在系统设置中允许 Node 或 Terminal 发送通知"
echo ""
echo "❌ 如果两个通知都没看到："
echo "   → 检查勿扰模式/专注模式是否开启"
echo "   → 检查系统通知设置是否被禁用"
echo "   → 检查音量和提示音设置"
echo ""
