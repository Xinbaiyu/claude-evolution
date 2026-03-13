#!/bin/bash

echo "🧪 手动测试 init 命令"
echo ""
echo "准备测试 - 备份现有配置"
mv ~/.claude-evolution ~/.claude-evolution.backup 2>/dev/null || true

echo ""
echo "开始测试 init 流程"
echo "请按照以下步骤操作:"
echo ""
echo "1. 选择 [2] 路由器模式"
echo "2. 使用默认端口 [Y]"
echo "3. 如果连接失败，选择继续 [y]"
echo "4. 观察期: 1"
echo "5. 建议期: 2"  
echo "6. 置信度: 0.8"
echo "7. 频率: 6h"
echo ""

node dist/cli/index.js init

echo ""
echo "测试完成! 查看配置:"
cat ~/.claude-evolution/config.json | grep -A 5 '"llm"'

echo ""
echo "恢复备份:"
echo "  rm -rf ~/.claude-evolution"
echo "  mv ~/.claude-evolution.backup ~/.claude-evolution"
