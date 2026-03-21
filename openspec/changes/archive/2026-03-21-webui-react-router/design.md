## Context

当前 WebUI 使用手写的 `renderPage()` switch-case 进行页面路由（`web/client/src/App.tsx`），Navigation 组件通过原生 `<a>` 标签导航（每次导航都会整页刷新）。现有 5 个页面：Dashboard、LearningReview、AnalysisLogs、SourceManager、Settings。

技术栈：React 19.2 + Vite 7 + TypeScript 5.9 + Tailwind CSS + Ant Design 6。后端使用 Express SPA fallback（所有非 `/api` 路径返回 `index.html`）。

这种架构存在以下问题：
1. 导航触发整页刷新，丢失组件状态（如表单输入、滚动位置）
2. 无法实现嵌套路由、路由守卫、路由参数等标准路由能力
3. 路由配置分散在 App.tsx（switch-case）和 Navigation.tsx（href 列表）中
4. 未来新增页面需要在多处手动添加路由映射

## Goals / Non-Goals

**Goals:**
- 引入 React Router v7 作为标准路由方案
- 实现 SPA 客户端导航（无整页刷新）
- 支持完整路由能力：嵌套路由、懒加载、路由参数、路由守卫
- 统一路由配置到单一文件
- 保持后端 Express SPA fallback 不变
- 保持现有页面 URL 路径不变（`/`、`/learning-review`、`/settings`、`/source-manager`、`/analysis-logs`）

**Non-Goals:**
- 不引入 React Router 的 Data API（loader/action）—— 当前页面已有成熟的 API 调用模式
- 不切换到 React Router Framework Mode（file-based routing）—— 项目规模不需要
- 不修改后端路由或 API 端点
- 不重构页面组件内部逻辑

## Decisions

### D1: 使用 React Router v7 Library Mode + `createBrowserRouter`

**选择**：使用 `createBrowserRouter` 创建路由实例，配合 `RouterProvider` 渲染。

**原因**：
- `createBrowserRouter` 是 React Router v7 推荐的方式，支持 lazy loading、error boundaries
- 比 `<BrowserRouter>` + `<Routes>` 模式更现代，且支持 `patchRoutesOnNavigation`
- Library Mode 适合现有项目的渐进式迁移，不需要引入构建工具层面的变更

**替代方案**：
- `<BrowserRouter>` + `<Routes>`：更简单但功能受限，不支持 lazy routes 和 data patterns
- Framework Mode（file-based routing）：过于重量级，需要改变项目结构

### D2: 统一路由配置文件 `routes.tsx`

**选择**：创建 `web/client/src/routes.tsx` 集中管理所有路由定义。

**原因**：
- 单一数据源避免 App.tsx 和 Navigation.tsx 路由定义分散
- Navigation 组件可从路由配置中派生导航项
- 新增页面只需修改一个文件

### D3: 使用 `lazy()` 实现页面级代码分割

**选择**：所有页面组件使用 `lazy: () => import('./pages/XXX')` 加载。

**原因**：
- 减少初始 bundle 大小
- 每个页面只在访问时才加载
- React Router v7 原生支持 lazy routes

### D4: Layout 路由实现共享布局

**选择**：创建 `Layout` 组件作为根路由的 `element`，内含 `<Outlet />` 渲染子页面。

**原因**：
- Navigation 和 Toast 组件在所有页面共享
- Layout 路由是 React Router 的标准模式
- 避免每个页面重复引入导航组件

### D5: Navigation 使用 `<NavLink>` 替代 `<a>`

**选择**：用 React Router 的 `<NavLink>` 替代原生 `<a>` 标签。

**原因**：
- `<NavLink>` 支持 SPA 导航（无刷新）
- 内置 `isActive` 状态自动高亮当前页
- 无需手动传递 `currentPage` prop

### D6: 404 页面兜底

**选择**：添加通配路由 `path: '*'` 显示 404 页面。

**原因**：
- 当前 default case 默认回退到 Dashboard，不够清晰
- 404 页面提供明确的用户反馈和导航回到首页的入口

## Risks / Trade-offs

- **[新增依赖]** → react-router v7 + react-router-dom v7 约增加 ~50KB gzipped。对于管理后台而言可接受。
- **[整页刷新行为变化]** → 用户习惯可能因导航从刷新变为 SPA 切换而感知到差异 → 无负面影响，体验更流畅。
- **[路由状态与 WebSocket]** → 当前 WebSocket 连接在 App 层管理，切换到 Layout 路由后需确保 WebSocket 生命周期不受影响 → WebSocket 在 Layout 组件中初始化即可，与当前行为一致。
- **[Express SPA fallback 兼容]** → 后端已正确配置所有非 `/api` 路径返回 `index.html`，React Router 的 `createBrowserRouter` 完全兼容。
