## 1. 项目结构初始化

- [x] 1.1 创建 `web/` 目录结构（server/ 和 client/）
- [x] 1.2 在 `web/server/` 初始化 Express 项目
- [x] 1.3 在 `web/client/` 使用 Vite 创建 React 项目
- [x] 1.4 配置 TypeScript for both frontend and backend
- [x] 1.5 更新根目录 package.json 添加 Web 相关依赖
- [x] 1.6 配置 Tailwind CSS 在前端项目中

## 2. 后端 API 服务器实现

- [x] 2.1 创建 Express 应用入口 `web/server/index.ts`
- [x] 2.2 实现建议列表 API (GET /api/suggestions)
- [x] 2.3 实现建议详情 API (GET /api/suggestions/:id)
- [x] 2.4 实现建议批准 API (POST /api/suggestions/:id/approve)
- [x] 2.5 实现建议拒绝 API (POST /api/suggestions/:id/reject)
- [x] 2.6 实现批量批准 API (POST /api/suggestions/batch/approve)
- [x] 2.7 实现系统状态 API (GET /api/status)
- [x] 2.8 实现配置读取 API (GET /api/config)
- [x] 2.9 实现配置更新 API (PATCH /api/config)
- [x] 2.10 实现手动分析触发 API (POST /api/analyze)
- [x] 2.11 添加文件锁保护并发写入
- [x] 2.12 添加 API 错误处理中间件
- [x] 2.13 添加请求日志记录

## 3. WebSocket 实时通知实现

- [x] 3.1 创建 WebSocket 服务器并与 Express 集成
- [x] 3.2 实现客户端连接管理（连接池）
- [x] 3.3 实现心跳机制（ping/pong）
- [x] 3.4 实现"analysis_complete"事件推送
- [x] 3.5 实现"new_suggestions"事件推送
- [x] 3.6 实现"suggestion_approved"事件推送
- [x] 3.7 实现"suggestion_rejected"事件推送
- [ ] 3.8 在分析流程中集成事件触发

## 4. 守护进程模式实现

- [ ] 4.1 创建 `src/cli/commands/start.ts` 命令
- [ ] 4.2 实现子进程 fork 和后台运行
- [ ] 4.3 实现 PID 文件写入 `~/.claude-evolution/daemon.pid`
- [ ] 4.4 创建 `src/cli/commands/stop.ts` 命令
- [ ] 4.5 实现读取 PID 并发送 SIGTERM
- [ ] 4.6 创建 `src/cli/commands/status.ts` 命令
- [ ] 4.7 实现进程状态检测和显示
- [ ] 4.8 创建 `src/cli/commands/logs.ts` 命令
- [ ] 4.9 实现日志文件读取和实时跟踪
- [ ] 4.10 实现优雅关闭逻辑（SIGTERM handler）
- [ ] 4.11 实现 stdout/stderr 重定向到日志文件
- [ ] 4.12 实现日志文件自动轮转

## 5. 前端基础架构

- [x] 5.1 配置 React Router 路由
- [x] 5.2 创建主布局组件（侧边栏 + 内容区）
- [x] 5.3 创建导航栏组件
- [ ] 5.4 创建 API 客户端封装（axios/fetch）
- [ ] 5.5 创建 WebSocket 客户端封装
- [ ] 5.6 实现 WebSocket 连接状态指示器
- [ ] 5.7 配置状态管理（Zustand）
- [ ] 5.8 创建全局 Toast 通知组件

## 6. Dashboard 页面实现

- [x] 6.1 创建 Dashboard 页面骨架
- [x] 6.2 实现系统状态卡片组件
- [x] 6.3 实现指标卡片组件（待审批、已批准、平均置信度）
- [x] 6.4 实现最近建议列表组件
- [x] 6.5 实现"Analyze Now"按钮和加载状态
- [ ] 6.6 实现 WebSocket 事件监听和数据刷新
- [x] 6.7 实现指标卡片点击跳转

## 7. Review 页面实现

- [ ] 7.1 创建 Review 页面骨架
- [ ] 7.2 实现建议卡片组件（紧凑视图）
- [ ] 7.3 实现建议列表渲染和按类型分组
- [ ] 7.4 实现建议详情展开/折叠
- [ ] 7.5 实现 Evidence 列表组件
- [ ] 7.6 实现单个建议批准按钮和逻辑
- [ ] 7.7 实现单个建议拒绝按钮和确认对话框
- [ ] 7.8 实现批量选择复选框
- [ ] 7.9 实现批量操作固定栏
- [ ] 7.10 实现批量批准功能
- [ ] 7.11 实现搜索框和实时过滤
- [ ] 7.12 实现类型筛选标签
- [ ] 7.13 实现排序下拉菜单（置信度、时间）

## 8. Settings 页面实现

- [ ] 8.1 创建 Settings 页面骨架
- [ ] 8.2 实现调度器配置区块（启用开关、间隔选择）
- [ ] 8.3 实现 LLM 配置区块（模型、tokens、温度）
- [ ] 8.4 实现通知配置区块（桌面通知、事件订阅）
- [ ] 8.5 实现学习阶段配置区块
- [ ] 8.6 实现 API 配置区块（模式选择、Base URL）
- [ ] 8.7 实现"Save Changes"按钮和批量保存逻辑
- [ ] 8.8 实现"Reset to Defaults"按钮和确认对话框
- [ ] 8.9 实现配置验证和错误提示

## 9. History 页面实现

- [ ] 9.1 创建 History 页面骨架
- [ ] 9.2 实现已批准建议列表
- [ ] 9.3 实现已拒绝建议列表
- [ ] 9.4 实现标签切换（Approved / Rejected）
- [ ] 9.5 实现时间线视图组件
- [ ] 9.6 实现日期范围筛选
- [ ] 9.7 实现历史记录搜索
- [ ] 9.8 实现导出功能（JSON / CSV）

## 10. 系统级桌面通知实现

- [x] 10.1 添加 node-notifier 依赖到 package.json
- [x] 10.2 创建通知管理模块 `web/server/notifications.ts`
- [x] 10.3 实现通知类型到页面路由的映射配置
- [x] 10.4 实现分析完成系统通知（跳转到 /review）
- [x] 10.5 实现分析失败系统通知（跳转到 /dashboard）
- [x] 10.6 实现新建议生成通知（跳转到 /review）
- [x] 10.7 实现配置变更通知（跳转到 /settings）
- [x] 10.8 实现系统错误通知（跳转到 /dashboard）
- [x] 10.9 在分析流程完成后触发系统通知
- [ ] 10.10 在 Settings 页面添加通知启用/禁用开关
- [x] 10.11 在启动时检测系统通知可用性（Linux）
- [x] 10.12 添加通知不可用时的日志警告和用户提示

## 11. UI 样式和交互优化

- [ ] 11.1 实现终端风格配色方案（暗色主题）
- [ ] 11.2 配置 JetBrains Mono 等宽字体
- [ ] 11.3 实现卡片 hover 效果和过渡动画
- [ ] 11.4 实现加载骨架屏
- [ ] 11.5 实现空状态提示（无建议时）
- [ ] 11.6 优化响应式布局（平板和桌面）
- [ ] 11.7 添加操作确认对话框样式
- [ ] 11.8 实现 Toast 通知样式
- [x] 11.9 完成 Web UI 中文翻译（Dashboard、Review、Settings）

## 12. 配置和集成

- [ ] 12.1 在 `src/config/schema.ts` 添加 webServer 配置
- [ ] 12.2 更新配置加载逻辑读取 Web 配置
- [ ] 12.3 在 init 命令中添加 Web 配置初始化
- [ ] 12.4 配置 Vite 生产构建输出到 `web/client/dist`
- [ ] 12.5 配置 Express 静态文件服务
- [ ] 12.6 实现 API 和静态文件路由优先级
- [ ] 12.7 更新 package.json scripts 添加 build:web
- [ ] 12.8 更新 .gitignore 忽略构建产物

## 13. 测试和文档

- [ ] 13.1 编写 API 端点单元测试
- [ ] 13.2 编写 WebSocket 连接测试
- [ ] 13.3 编写守护进程启停测试
- [ ] 13.4 编写前端组件快照测试
- [ ] 13.5 更新 README 添加 Web UI 使用说明
- [ ] 13.6 创建 WEB-UI-GUIDE.md 详细文档
- [ ] 13.7 更新命令行帮助文本
- [ ] 13.8 添加故障排查指南

## 14. 端到端验证

- [ ] 14.1 验证 `claude-evolution start` 启动成功
- [ ] 14.2 验证浏览器访问 http://localhost:10010
- [ ] 14.3 验证 Dashboard 数据加载正确
- [ ] 14.4 验证 Review 页面批准/拒绝功能
- [ ] 14.5 验证 Settings 配置保存和生效
- [ ] 14.6 验证系统通知在 macOS/Windows/Linux 上正常显示
- [ ] 14.7 验证点击通知自动打开浏览器并跳转到正确页面
- [ ] 14.8 验证通知类型路由映射正确
- [ ] 14.8 验证 `claude-evolution stop` 优雅关闭
- [ ] 14.9 验证 `claude-evolution status` 状态显示
- [ ] 14.10 验证 CLI 命令向后兼容性
- [ ] 14.11 验证端口占用时的错误处理
- [ ] 14.12 验证进程崩溃恢复和日志记录
