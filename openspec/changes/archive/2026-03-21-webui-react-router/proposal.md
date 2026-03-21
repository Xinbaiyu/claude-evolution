## Why

当前 WebUI 的页面切换依赖 App.tsx 中手写的 `renderPage()` switch/case 逻辑，不支持嵌套路由、懒加载、路由守卫等标准路由能力。随着页面数量增长，手动维护路由映射和导航高亮逻辑越来越脆弱，且无法利用浏览器原生的前进/后退、URL 参数传递等能力。引入 React Router v7 可以用声明式路由配置替代命令式 switch/case，为后续新增页面和嵌套路由打下标准化基础。

## What Changes

- **引入 React Router v7** 作为客户端路由管理器，替代 `renderPage()` 中的 switch/case 逻辑
- **创建集中式路由配置**（`routes.tsx`），所有页面路由在一处声明
- **Layout 路由**：将 Navigation 侧边栏 + Toast 提取为共享 Layout 组件，页面作为子路由通过 `<Outlet>` 渲染
- **路由懒加载**：所有页面组件使用 `React.lazy()` 按需加载，减少首屏 bundle 体积
- **404 页面**：未匹配路由展示 NotFound 页面
- **Navigation 组件改造**：使用 `<NavLink>` 替代手写 `<a>` 标签，自动支持活跃状态高亮
- **路由守卫机制**：提供 ProtectedRoute 包装组件，支持未来的权限控制需求
- **服务端 SPA fallback 保持不变**：Express 已有的 `app.get('*')` fallback 无需修改

## Capabilities

### New Capabilities
- `webui-router`: 基于 React Router v7 的客户端路由系统，包括路由配置、Layout 嵌套、懒加载、路由守卫和 404 处理

### Modified Capabilities
- `evolution-dashboard`: WebUI 页面组件需要适配新的路由系统（从直接渲染改为路由组件）

## Impact

- **前端代码**：`web/client/src/App.tsx`（重写）、`web/client/src/components/Navigation.tsx`（改造为使用 NavLink）、所有页面组件（添加 lazy 导出）
- **新增文件**：`routes.tsx`（路由配置）、`layouts/MainLayout.tsx`（共享布局）、`pages/NotFound.tsx`（404 页面）、`components/ProtectedRoute.tsx`（路由守卫）
- **依赖变更**：新增 `react-router` 和 `react-router-dom` 包
- **后端代码**：无变更，Express SPA fallback 已满足需求
- **构建配置**：无变更，Vite 已支持 SPA 模式
