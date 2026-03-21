## Why

CLAUDE.md 中每个偏好/模式/工作流条目都带有类似「观察到 34 次，来自 15 个会话」的统计行。这些数字对 LLM 理解和执行指令没有实际帮助，但每条都消耗额外 token，在条目多时累积浪费可观。排序本身已隐含权重信息（高频靠前），无需重复表达。

## What Changes

- 移除 CLAUDE.md 生成时三类条目（偏好、模式、工作流）的统计描述行
- 每个条目从两行（描述 + 统计）变为一行（仅描述）
- 排序逻辑（按 mentions 降序）保持不变，确保高频条目仍排在前面

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `md-config-generator`: 移除偏好/模式/工作流条目的统计行输出，只保留描述本身

## Impact

- 修改文件：`src/memory/claudemd-generator.ts`
- 输出变化：`~/.claude-evolution/output/CLAUDE.md` 中每个条目减少一行
- 预计节省：每条目约 15-20 个 token，整体可节省数百 token
- 无 API 变更、无数据模型变更、无破坏性变更
