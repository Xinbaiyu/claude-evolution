## 1. 后端 API 实现

- [x] 1.1 创建 `web/server/routes/source.ts` 路由文件
- [x] 1.2 实现 `GET /api/source/files` 获取 source 文件列表
- [x] 1.3 实现 `GET /api/source/files/:filename` 读取文件内容
- [x] 1.4 实现 `PUT /api/source/files/:filename` 保存文件并触发重新生成
- [x] 1.5 实现 `GET /api/source/claude-md` 获取 CLAUDE.md 内容
- [x] 1.6 在 `web/server/index.ts` 中注册 source 路由

## 2. 前端依赖安装

- [x] 2.1 安装 `@uiw/react-md-editor` Markdown 编辑器库
- [x] 2.2 安装 `@uiw/react-markdown-preview` Markdown 预览库（如需）

## 3. 前端组件实现

- [x] 3.1 创建 `web/client/src/components/FileList.tsx` 文件列表组件
- [x] 3.2 创建 `web/client/src/components/MarkdownEditor.tsx` Markdown 编辑器组件
- [x] 3.3 创建 `web/client/src/components/ClaudeMdPreview.tsx` CLAUDE.md 预览组件
- [x] 3.4 创建 `web/client/src/pages/SourceManager.tsx` 主页面组件

## 4. 前端核心功能实现

- [x] 4.1 实现文件列表加载和显示逻辑
- [x] 4.2 实现文件选择和切换逻辑
- [x] 4.3 实现 Markdown 编辑器集成和内容编辑
- [x] 4.4 实现保存功能和错误处理
- [x] 4.5 实现未保存修改检测和确认对话框
- [x] 4.6 实现 CLAUDE.md 预览自动刷新
- [x] 4.7 实现加载状态和错误提示 UI

## 5. 前端路由配置

- [x] 5.1 在 `web/client/src/App.tsx` 添加 `/source-manager` 路由
- [x] 5.2 更新导航栏（如有）添加 Source Manager 入口

## 6. 样式和 UI 优化

- [x] 6.1 实现三栏响应式布局（文件列表、编辑器、预览）
- [x] 6.2 添加文件列表高亮选中状态
- [x] 6.3 添加保存按钮和加载状态动画
- [x] 6.4 优化 Markdown 编辑器和预览区域的样式

## 7. 测试和验证

- [x] 7.1 手动测试：加载文件列表
- [x] 7.2 手动测试：选择文件并编辑内容
- [x] 7.3 手动测试：保存文件并验证 CLAUDE.md 重新生成
- [x] 7.4 手动测试：预览区域自动刷新
- [x] 7.5 手动测试：未保存修改警告功能
- [x] 7.6 手动测试：错误处理（无文件、保存失败等）

## 8. 文档更新

- [x] 8.1 更新 README.md 添加 Source Manager 功能说明
- [x] 8.2 更新 Web UI 使用文档
