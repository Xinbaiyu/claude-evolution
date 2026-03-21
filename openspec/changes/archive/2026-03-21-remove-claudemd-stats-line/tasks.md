## 1. 移除统计行

- [x] 1.1 在 `src/memory/claudemd-generator.ts` 的 `generatePreferencesSection()` 中删除偏好统计行（`观察到 X 次，来自 Y 个会话`）
- [x] 1.2 在 `generatePatternsSection()` 中删除模式统计行（`出现 X 次，来自 Y 个会话`）
- [x] 1.3 在 `generateWorkflowsSection()` 中删除工作流统计行（`使用 X 次，来自 Y 个会话`）

## 2. 验证

- [x] 2.1 构建验证 `pnpm build` 通过
- [x] 2.2 重新生成 CLAUDE.md，确认统计行已消失、偏好描述保留完整
