## ADDED Requirements

### Requirement: Display final CLAUDE.md content
系统 SHALL 显示最终生成的 `~/.claude-evolution/output/CLAUDE.md` 文件的完整内容。

#### Scenario: Initial load
- **WHEN** 用户访问 source manager 页面
- **THEN** 系统在右侧预览区域显示当前的 CLAUDE.md 内容

#### Scenario: Content is read-only
- **WHEN** 用户尝试编辑预览区域的内容
- **THEN** 系统不允许编辑，预览区域保持只读状态

### Requirement: Auto-refresh on regeneration
预览区域 SHALL 在 CLAUDE.md 重新生成后自动刷新。

#### Scenario: Refresh after save
- **WHEN** 用户保存 source 文件后系统完成 CLAUDE.md 重新生成
- **THEN** 右侧预览区域自动刷新显示最新内容

#### Scenario: Show loading state
- **WHEN** CLAUDE.md 正在重新生成
- **THEN** 预览区域显示加载状态提示 "正在生成..."

### Requirement: Highlight source content
预览区域 SHOULD 区分显示来自 source 和 learned 的内容。

#### Scenario: Visual distinction
- **WHEN** 预览 CLAUDE.md 内容
- **THEN** 系统以不同颜色或标记区分 source 和 learned 部分
- **AND** 提供图例说明哪些是静态规则，哪些是学习内容

### Requirement: Scroll synchronization
预览区域 SHOULD 支持与编辑器的滚动同步（可选优化）。

#### Scenario: Sync scroll position
- **WHEN** 用户编辑 source 文件并滚动编辑器
- **THEN** 预览区域自动滚动到对应位置

### Requirement: API endpoint for preview
系统 SHALL 提供后端 API 获取 CLAUDE.md 内容。

#### Scenario: Get CLAUDE.md content
- **WHEN** 前端调用 `GET /api/source/claude-md`
- **THEN** 系统返回最终生成的 CLAUDE.md 文件内容

#### Scenario: Get generation status
- **WHEN** 前端调用 `GET /api/source/status`
- **THEN** 系统返回当前是否正在生成 CLAUDE.md 的状态
