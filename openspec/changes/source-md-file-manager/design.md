## Context

当前 claude-evolution 系统通过合并 `~/.claude-evolution/source/` 和 `learned/` 目录的 MD 文件生成最终的 CLAUDE.md 配置。用户只能通过命令行或文本编辑器修改 source 文件，且修改后需要手动触发重新生成。

现有 Web UI 已有 Dashboard、Review、Settings 三个页面，使用简单的客户端路由实现。后端使用 Express.js 提供 REST API，前端使用 React + Tailwind CSS。

本设计旨在添加一个新的 `/source-manager` 页面，提供可视化的文件编辑界面，提升用户体验。

## Goals / Non-Goals

**Goals:**
- 提供直观的 Web UI 界面管理 source 目录的 MD 文件
- 实现在线 Markdown 编辑器，支持语法高亮
- 保存后自动触发 CLAUDE.md 重新生成
- 实时预览最终生成的 CLAUDE.md 内容
- 防止用户意外丢失未保存的修改

**Non-Goals:**
- 不支持创建或删除 source 文件（仅编辑现有文件）
- 不支持编辑 learned 目录的文件（这些文件由系统自动生成）
- 不支持文件重命名或移动
- 不实现协作编辑或版本控制功能（Git 已提供）

## Decisions

### 1. UI 布局设计

**决策**: 采用三栏布局
- 左侧：文件列表（固定宽度 250px）
- 中间：Markdown 编辑器（弹性布局）
- 右侧：CLAUDE.md 预览（固定宽度 40%）

**理由**:
- 三栏布局符合常见的文件管理器模式（VS Code、Notion）
- 分离编辑和预览区域，避免视觉干扰
- 固定文件列表宽度保证可读性，中间编辑器弹性适应不同屏幕尺寸

**替代方案**: 双栏布局（文件列表+编辑器），点击按钮切换预览
- 被拒绝原因：需要额外点击才能看到预览，降低实时反馈体验

### 2. Markdown 编辑器选型

**决策**: 使用 `@uiw/react-md-editor`

**理由**:
- 轻量级（~50KB gzipped）
- 内置语法高亮和预览功能
- 支持 Tailwind CSS 样式定制
- 活跃维护，TypeScript 支持良好

**替代方案**:
1. `react-markdown-editor-lite` - 功能更强但体积较大（~200KB）
2. `react-simplemde-editor` - 基于 SimpleMDE，但依赖较老
3. 纯 `<textarea>` - 实现简单但缺乏语法高亮

### 3. 文件保存触发重新生成机制

**决策**: 使用后端 API 同步触发 `generateCLAUDEmd()`

**流程**:
1. 前端调用 `PUT /api/source/files/:filename` 保存文件
2. 后端保存文件到磁盘
3. 后端立即调用 `generateCLAUDEmd()` 重新生成
4. 生成完成后返回成功响应
5. 前端收到响应后自动刷新预览区域

**理由**:
- 保证保存和重新生成的原子性
- 用户保存后立即看到最新效果
- 避免轮询或 WebSocket 的复杂性

**替代方案**: 异步触发 + WebSocket 通知
- 被拒绝原因：CLAUDE.md 生成速度快（<1s），同步方案足够，无需引入 WebSocket 复杂性

### 4. 未保存修改检测

**决策**: 前端维护 `isDirty` 状态标记

**实现**:
- 编辑器 onChange 时设置 `isDirty = true`
- 保存成功后设置 `isDirty = false`
- 切换文件或离开页面时检查 `isDirty`，若为 true 则显示确认对话框

**理由**:
- 前端状态管理简单直接
- 不依赖后端，响应速度快
- 避免用户误操作丢失修改

### 5. API 设计

**端点**:
- `GET /api/source/files` - 获取 source 文件列表
- `GET /api/source/files/:filename` - 读取文件内容
- `PUT /api/source/files/:filename` - 保存文件并触发重新生成
- `GET /api/source/claude-md` - 获取最终 CLAUDE.md 内容

**理由**:
- RESTful 风格，符合现有 API 设计习惯
- 简单清晰，前端易于使用

### 6. 前端状态管理

**决策**: 使用 React Hooks (`useState`, `useEffect`) 管理本地状态，不引入 Redux/Zustand

**理由**:
- 页面状态简单（文件列表、当前文件、编辑内容、预览内容）
- 不涉及复杂的跨组件共享状态
- 保持代码简洁，降低依赖

## Risks / Trade-offs

### 1. 大文件编辑性能
**风险**: 如果 source 文件过大（>10MB），编辑器可能卡顿
**缓解**:
- 目前 source 文件都很小（<10KB），风险极低
- 如需支持大文件，可考虑虚拟滚动或分页加载

### 2. 并发编辑冲突
**风险**: 用户在 Web UI 编辑同时，通过文本编辑器也修改了同一文件
**缓解**:
- 当前设计假设单用户使用，不处理并发冲突
- 用户需自行管理编辑方式（Web UI 或本地编辑器，但不同时使用）
- 未来可考虑添加文件修改时间检测，保存时比对是否有外部修改

### 3. CLAUDE.md 生成失败
**风险**: `generateCLAUDEmd()` 可能因权限或文件系统错误失败
**缓解**:
- 后端捕获错误并返回详细错误信息给前端
- 前端显示友好的错误提示
- 保留用户的编辑内容，允许重新保存

### 4. 浏览器兼容性
**风险**: Markdown 编辑器可能在旧版浏览器不兼容
**缓解**:
- 目标用户是开发者，通常使用现代浏览器
- 要求 Chrome/Firefox/Safari/Edge 最新版本
- 不支持 IE11

## Migration Plan

**部署步骤**:
1. 后端：添加新路由 `/api/source/*`
2. 前端：添加新页面和组件
3. 前端：更新 App.tsx 路由配置
4. 测试：手动测试编辑、保存、预览流程
5. 部署：无需数据库迁移，直接部署即可

**回滚策略**:
- 如有问题，移除 `/source-manager` 路由即可
- 不影响现有功能（Dashboard、Review、Settings）

## Open Questions

1. **是否需要支持撤销/重做功能？**
   - 当前决策：不实现，依赖编辑器的原生 Ctrl+Z/Ctrl+Y
   - 如用户反馈需要，可后续添加历史记录功能

2. **是否需要支持 Markdown 预览（编辑器内）？**
   - 当前决策：不实现，右侧预览区已提供完整预览
   - 编辑器专注于编辑体验

3. **是否需要语法检查或 Linter？**
   - 当前决策：不实现，Markdown 格式较自由
   - 如需规范，可后续集成 markdownlint
