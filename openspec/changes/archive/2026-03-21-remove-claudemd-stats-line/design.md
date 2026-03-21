## Context

`claudemd-generator.ts` 的 `generatePreferencesSection()`、`generatePatternsSection()`、`generateWorkflowsSection()` 三个函数中，每个条目都会输出一行统计信息：

```typescript
// 偏好
lines.push(`  - 观察到 ${obs.mentions} 次，来自 ${evidenceCount} 个会话`);
// 模式
lines.push(`  - 出现 ${obs.mentions} 次，来自 ${evidenceCount} 个会话`);
// 工作流
lines.push(`  - 使用 ${obs.mentions} 次，来自 ${evidenceCount} 个会话`);
```

这些行对 LLM 执行指令无帮助，但每条消耗约 15-20 token。条目按 `mentions` 降序排列，排序本身已隐含权重。

## Goals / Non-Goals

**Goals:**
- 移除三类条目生成时的统计描述行
- 减少 CLAUDE.md 的 token 消耗

**Non-Goals:**
- 不改变排序逻辑（仍按 mentions 降序）
- 不改变数据模型或存储格式
- 不移除 metadata header 中的总体统计数字（那是给开发者看的，不影响 LLM token）

## Decisions

**直接删除统计行 vs. 替换为简短标签**

选择直接删除。理由：排序已隐含权重信息，额外标签（如 ★★★）也会消耗 token 且对 LLM 指令遵从没有实质帮助。最简方案就是最优方案。

## Risks / Trade-offs

- [人类调试时失去统计可见性] → 统计数据仍存在于 `context.json` 中，CLAUDE.md metadata header 也有总数统计，影响极小
- [排序隐含的权重不够明确] → 实践中 LLM 对列表位置有自然的权重感知，且偏好描述本身足够表达意图
