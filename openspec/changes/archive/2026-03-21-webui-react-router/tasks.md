## 1. 依赖安装

- [x] 1.1 在 `web/client/` 下安装 `react-router` 和 `react-router-dom` v7

## 2. 路由配置与 Layout

- [x] 2.1 创建 `web/client/src/layouts/MainLayout.tsx`，包含 Navigation 组件、`<Outlet />` 和 Toast 组件
- [x] 2.2 创建 `web/client/src/pages/NotFound.tsx` 404 页面，包含回到首页的 Link
- [x] 2.3 创建 `web/client/src/router.tsx`，使用 `createBrowserRouter` 定义路由配置：
  - 根路由使用 MainLayout 作为 element
  - Dashboard 作为 index 路由（非 lazy，包含在主 bundle）
  - LearningReview / AnalysisLogs / SourceManager / Settings 使用 `lazy()` 按需加载
  - `path: '*'` 匹配 NotFound 页面

## 3. 入口文件改造

- [x] 3.1 修改 `web/client/src/main.tsx`，将 `<App />` 替换为 `<RouterProvider router={router} />`
- [x] 3.2 修改 `web/client/src/App.tsx`（可删除或重构为 router.tsx 的一部分）

## 4. Navigation 组件改造

- [x] 4.1 修改 `web/client/src/components/Navigation.tsx`：
  - 将 `<a href>` 替换为 `<NavLink to>`
  - 移除 `currentPage` prop，改用 NavLink 的 `className` 回调获取 `isActive` 状态
  - 保持现有样式不变（active 时 amber 高亮效果）

## 5. 页面组件适配

- [x] 5.1 确保所有页面组件导出适配 lazy loading（各页面的 `export default` 已满足要求）
- [x] 5.2 移除各页面组件中对 Navigation 的内联引用（如有），确保 Navigation 仅由 MainLayout 渲染
- [x] 5.3 将 AnalysisLogs 页面中链接到详情的逻辑（如有）改为使用 `useNavigate()` 或 `<Link>`

## 6. 验证与测试

- [x] 6.1 验证所有 5 个页面路径可正常访问且 URL 不变
- [x] 6.2 验证浏览器前进/后退按钮正常工作
- [x] 6.3 验证直接访问深链接（如 `http://localhost:10010/settings`）可正确渲染
- [x] 6.4 验证 404 页面在未匹配路由时正确显示
- [x] 6.5 验证 Navigation 当前页高亮正确
- [x] 6.6 验证 WebSocket 连接在路由切换时不中断
- [x] 6.7 运行 TypeScript 类型检查 (`tsc`) 确认无类型错误
- [x] 6.8 运行 Vite build 确认生产构建成功
