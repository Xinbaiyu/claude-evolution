## 1. 类型定义重命名

- [x] 1.1 将 `Preference.type` 的 `'workflow'` 值重命名为 `'development-process'`，更新 `src/types/legacy.ts` 中的类型联合
- [x] 1.2 更新 `src/analyzers/prompts.ts` 中 LLM 提取提示词，将 `"workflow"` 分类替换为 `"development-process"`

## 2. CLAUDE.md 生成器分组标题映射

- [x] 2.1 在 `src/memory/claudemd-generator.ts` 的 `generatePreferencesSection()` 中添加 category 显示名映射（`development-process` → `开发流程`，`communication` → `沟通方式`，`style` → `代码风格`，`tool` → `工具偏好`）
- [x] 2.2 确保 fallback 逻辑：未映射的 category 值直接使用原值作为标题

## 3. 存量数据迁移

- [x] 3.1 编写一次性迁移函数，扫描 `context.json` 和 `observations.json`，将所有 `item.type === 'workflow'` 且 `obs.type === 'preference'` 的记录更新为 `item.type = 'development-process'`
- [x] 3.2 在 daemon 启动流程（`lifecycle.ts`）中调用迁移函数，确保只执行一次（幂等）

## 4. 验证

- [x] 4.1 构建通过（`npm run build`）
- [x] 4.2 手动触发 `regenerateClaudeMdFromDisk()`，验证生成的 CLAUDE.md 中"用户偏好"下不再出现 `workflow` 子标题，改为 `开发流程`
- [x] 4.3 确认"工作流程"大区块（`obs.type === 'workflow'`）仍正常渲染
