#!/bin/bash

# API 模式选择功能演示脚本

echo "════════════════════════════════════════════════════════════"
echo "  Claude Evolution - API 模式选择功能演示"
echo "════════════════════════════════════════════════════════════"
echo ""

# 备份现有配置
if [ -d ~/.claude-evolution ]; then
  echo "📦 备份现有配置..."
  mv ~/.claude-evolution ~/.claude-evolution.demo-backup
  echo "✓ 已备份到 ~/.claude-evolution.demo-backup"
  echo ""
fi

echo "════════════════════════════════════════════════════════════"
echo "  演示 1: 路由器模式（自动检测）"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "将会选择:"
echo "  - API 模式: [2] 路由器"
echo "  - 默认端口: Y (3456)"
echo "  - 观察期: 1 天"
echo "  - 建议期: 2 天"
echo "  - 置信度: 0.8"
echo "  - 频率: 6h"
echo ""
read -p "按 Enter 开始演示 1..."
echo ""

# 运行 init（路由器模式）
cat << EOF | node dist/cli/index.js init
2
Y
y
1
2
0.8
6h
EOF

echo ""
echo "────────────────────────────────────────────────────────────"
echo "📄 生成的配置:"
echo "────────────────────────────────────────────────────────────"
cat ~/.claude-evolution/config.json | jq '{llm: .llm}' 2>/dev/null || \
  (cat ~/.claude-evolution/config.json | grep -A 8 '"llm"')

echo ""
echo "✅ 演示 1 完成!"
echo ""
read -p "按 Enter 继续演示 2..."
echo ""

# 清理
rm -rf ~/.claude-evolution

echo "════════════════════════════════════════════════════════════"
echo "  演示 2: 标准模式"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "将会选择:"
echo "  - API 模式: [1] 标准（或直接 Enter）"
echo "  - 观察期: 3 天（默认）"
echo "  - 建议期: 4 天（默认）"
echo "  - 置信度: 0.8（默认）"
echo "  - 频率: 24h（默认）"
echo ""
read -p "按 Enter 开始演示 2..."
echo ""

# 运行 init（标准模式）
cat << EOF | node dist/cli/index.js init

3
4
0.8
24h
EOF

echo ""
echo "────────────────────────────────────────────────────────────"
echo "📄 生成的配置:"
echo "────────────────────────────────────────────────────────────"
cat ~/.claude-evolution/config.json | jq '{llm: .llm}' 2>/dev/null || \
  (cat ~/.claude-evolution/config.json | grep -A 8 '"llm"')

echo ""
echo "✅ 演示 2 完成!"
echo ""

# 恢复备份
echo "════════════════════════════════════════════════════════════"
echo "  恢复原始配置"
echo "════════════════════════════════════════════════════════════"
echo ""
rm -rf ~/.claude-evolution
if [ -d ~/.claude-evolution.demo-backup ]; then
  mv ~/.claude-evolution.demo-backup ~/.claude-evolution
  echo "✓ 已恢复原始配置"
else
  echo "ℹ️  无原始配置需要恢复"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  演示完成! 🎉"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "关键特性:"
echo "  ✓ 初始化时可选择 API 模式"
echo "  ✓ 路由器模式自动验证连接"
echo "  ✓ 根据模式显示不同的使用说明"
echo "  ✓ 配置自动保存到 ~/.claude-evolution/config.json"
echo ""
echo "查看完整文档: API-MODE-IMPLEMENTATION.md"
echo ""
