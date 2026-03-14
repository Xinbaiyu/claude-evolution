## Why

用户需要一个便捷的方式通过 Web UI 管理 `~/.claude-evolution/source/` 目录下的静态规则文件。当前只能通过命令行或文本编辑器修改这些文件，缺乏可视化界面，且修改后需要手动触发重新生成 CLAUDE.md。这个功能将提升用户体验，让配置管理更加直观和高效。

## What Changes

- 新增 Web UI 页面 `/source-manager`，用于管理 source 目录的 MD 文件
- 实现文件列表展示、在线编辑、保存功能
- 保存时自动触发 `md-generator` 重新生成 CLAUDE.md
- 提供最终 CLAUDE.md 的只读预览
- 添加后端 API 支持文件读取、保存、触发生成

## Capabilities

### New Capabilities
- `source-file-editor`: 提供在线 Markdown 编辑器，支持编辑 source 目录下的 MD 文件，保存后自动触发 CLAUDE.md 重新生成
- `claude-md-preview`: 显示最终生成的 CLAUDE.md 内容的只读预览，实时反映编辑后的变化

### Modified Capabilities
<!-- 不涉及现有功能的需求变更 -->

## Impact

**新增文件**:
- `web/client/src/pages/SourceManager.tsx` - 新页面组件
- `web/client/src/components/MarkdownEditor.tsx` - Markdown 编辑器组件
- `web/client/src/components/FileList.tsx` - 文件列表组件
- `web/client/src/components/ClaudeMdPreview.tsx` - CLAUDE.md 预览组件
- `web/server/routes/source.ts` - 后端 API 路由

**修改文件**:
- `web/client/src/App.tsx` - 添加路由配置
- `web/server/index.ts` - 注册新路由

**依赖**:
- 前端可能需要 Markdown 编辑器库（如 `react-markdown`, `@uiw/react-md-editor` 等）
- 复用现有的 `md-generator.ts` 模块
