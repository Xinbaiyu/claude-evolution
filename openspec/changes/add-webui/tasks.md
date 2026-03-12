# Web UI 实施任务清单

> **优先级说明**:
> - **P0** (关键): MVP 核心功能，阻塞发布
> - **P1** (重要): 生产化必需，Sprint 2 完成
> - **P2** (优化): 体验提升，Sprint 3 完成
> - **P3** (未来): 可选功能，后续迭代

---

## ✅ 已完成 (基础设施)

<details>
<summary>展开查看已完成任务</summary>

### 项目结构初始化
- [x] 创建 `web/` 目录结构（server/ 和 client/）
- [x] 在 `web/server/` 初始化 Express 项目
- [x] 在 `web/client/` 使用 Vite 创建 React 项目
- [x] 配置 TypeScript for both frontend and backend
- [x] 更新根目录 package.json 添加 Web 相关依赖
- [x] 配置 Tailwind CSS 在前端项目中

### 后端 API 服务器
- [x] 创建 Express 应用入口 `web/server/index.ts`
- [x] 实现建议列表 API (GET /api/suggestions)
- [x] 实现建议详情 API (GET /api/suggestions/:id)
- [x] 实现建议批准 API (POST /api/suggestions/:id/approve)
- [x] 实现建议拒绝 API (POST /api/suggestions/:id/reject)
- [x] 实现批量批准 API (POST /api/suggestions/batch/approve)
- [x] 实现系统状态 API (GET /api/status)
- [x] 实现配置读取 API (GET /api/config)
- [x] 实现配置更新 API (PATCH /api/config)
- [x] 实现手动分析触发 API (POST /api/analyze)
- [x] 添加文件锁保护并发写入
- [x] 添加 API 错误处理中间件
- [x] 添加请求日志记录

### WebSocket 基础设施
- [x] 创建 WebSocket 服务器并与 Express 集成
- [x] 实现客户端连接管理（连接池）
- [x] 实现心跳机制（ping/pong）
- [x] 实现"analysis_complete"事件推送
- [x] 实现"new_suggestions"事件推送
- [x] 实现"suggestion_approved"事件推送
- [x] 实现"suggestion_rejected"事件推送

### Dashboard 页面 (静态)
- [x] 创建 Dashboard 页面骨架
- [x] 实现系统状态卡片组件
- [x] 实现指标卡片组件（待审批、已批准、平均置信度）
- [x] 实现最近建议列表组件
- [x] 实现"Analyze Now"按钮和加载状态
- [x] 实现指标卡片点击跳转

### 桌面通知系统
- [x] 添加 node-notifier 依赖到 package.json
- [x] 创建通知管理模块 `web/server/notifications.ts`
- [x] 实现通知类型到页面路由的映射配置
- [x] 实现分析完成系统通知（跳转到 /review）
- [x] 实现分析失败系统通知（跳转到 /dashboard）
- [x] 实现新建议生成通知（跳转到 /review）
- [x] 实现配置变更通知（跳转到 /settings）
- [x] 实现系统错误通知（跳转到 /dashboard）
- [x] 在分析流程完成后触发系统通知
- [x] 在启动时检测系统通知可用性（Linux）
- [x] 添加通知不可用时的日志警告和用户提示

### 前端基础
- [x] 配置 React Router 路由
- [x] 创建主布局组件（侧边栏 + 内容区）
- [x] 创建导航栏组件

### 中文翻译
- [x] 完成 Web UI 中文翻译（Dashboard、Review、Settings）

</details>

---

## 🎯 Sprint 1: 核心可用性 (MVP)

**目标**: 用户能通过 Web UI 审核建议，Dashboard 实时刷新

### Phase 1.1: 前端基础架构 (P0)

- [x] **5.4** 创建 API 客户端封装（fetch）
  - 实现 `src/web/client/src/api/client.ts`
  - 封装所有 API 端点调用
  - 统一错误处理和 Toast 提示

- [x] **5.8** 创建全局 Toast 通知组件
  - 实现 `src/web/client/src/components/Toast.tsx`
  - 支持 success/error/info/warning 类型
  - 自动消失（3 秒）

- [x] **5.5** 创建 WebSocket 客户端封装
  - 实现 `src/web/client/src/api/websocket.ts`
  - 自动重连机制
  - 事件订阅/取消订阅

**✅ 测试检查点 (30 分钟)**:
```bash
# API 客户端连接性测试
- [ ] 能否成功调用 GET /api/suggestions
- [ ] 网络错误是否正确提示 Toast
- [ ] Toast 是否正确显示和自动消失

# 手动测试清单
1. 打开浏览器控制台
2. 触发 API 调用
3. 验证 Toast 显示
4. 验证错误处理
```

---

### Phase 1.2: Review 页面核心功能 (P0)

- [x] **7.1** 创建 Review 页面骨架（替换占位内容）
  - 实现数据加载逻辑
  - 加载状态和错误状态

- [x] **7.2** 实现建议卡片组件
  - 创建 `SuggestionCard.tsx`
  - 显示类型、描述、置信度、频率
  - 支持展开/折叠详情

- [x] **7.3** 实现建议列表渲染和按类型分组
  - Preference / Pattern / Workflow 分组
  - 空状态提示

- [x] **7.5** 实现 Evidence 列表组件
  - 显示证据引用
  - 支持展开查看详情

- [x] **7.6** 实现单个建议批准按钮和逻辑
  - 调用 POST /api/suggestions/:id/approve
  - 成功后刷新列表
  - Toast 提示

- [x] **7.7** 实现单个建议拒绝按钮和确认对话框
  - 确认对话框组件
  - 调用 POST /api/suggestions/:id/reject
  - 成功后刷新列表

**✅ 测试检查点 (1 小时)**:
```bash
# API 集成测试（关键！）
npm run test:api

测试用例:
- [ ] POST /api/suggestions/:id/approve 正确更新 pending.json
- [ ] 批准后 learned/ 目录生成对应文件
- [ ] POST /api/suggestions/:id/reject 正确更新 pending.json
- [ ] 并发批准不会损坏 JSON 文件
- [ ] 文件锁机制正常工作

# E2E 测试（核心流程）
npm run test:e2e:review

测试场景:
- [ ] 用户访问 /review 页面
- [ ] 看到建议列表
- [ ] 点击批准按钮
- [ ] 看到成功提示
- [ ] 建议从列表消失
- [ ] Dashboard 指标更新
```

**⚠️  关键风险**:
- 数据完整性：批准/拒绝操作必须原子性
- 并发控制：文件锁机制已实现但需验证

---

### Phase 1.3: 实时刷新 (P0)

- [x] **3.8** 在分析流程中集成 WebSocket 事件触发
  - 修改 `src/learners/analyzer.ts`
  - 分析完成后触发 `analysis_complete` 事件
  - 新建议生成后触发 `new_suggestions` 事件

- [x] **6.6** 实现 Dashboard WebSocket 事件监听和数据刷新
  - 监听 WebSocket 事件
  - 自动重新获取系统状态
  - 更新指标卡片

- [x] **5.6** 实现 WebSocket 连接状态指示器
  - 右上角显示连接状态（已连接/断开/重连中）
  - 断开时提示用户

**✅ 测试检查点 (30 分钟)**:
```bash
# WebSocket 推送测试（手动）
测试步骤:
1. [ ] 打开 Dashboard 页面
2. [ ] 在终端运行 claude-evolution analyze --now
3. [ ] 验证 Dashboard 自动刷新（无需手动刷新页面）
4. [ ] 验证桌面通知弹出
5. [ ] 验证 Review 页面建议列表更新
```

---

### Sprint 1 交付物

- ✅ 用户可以在 Web UI 审核建议
- ✅ Dashboard 实时刷新（分析完成时）
- ✅ 桌面通知提醒用户
- ✅ 核心流程 E2E 测试通过

**验收标准**:
```bash
# 完整用户流程
1. [ ] 启动 Web UI (./start-ui.sh)
2. [ ] 访问 http://localhost:10010
3. [ ] Dashboard 显示正确数据
4. [ ] 点击"审核建议"进入 Review 页面
5. [ ] 看到待审批建议列表
6. [ ] 批准一个建议
7. [ ] 看到成功提示
8. [ ] 建议从列表消失
9. [ ] 返回 Dashboard，指标更新
10. [ ] 运行分析，Dashboard 自动刷新
11. [ ] 收到桌面通知
```

---

## 🔧 Sprint 2: 生产化准备

**目标**: `claude-evolution start` 启动 Web UI，支持守护进程模式

### Phase 2.1: 配置集成 (P1)

- [ ] **12.1** 在 `src/config/schema.ts` 添加 webServer 配置
  ```typescript
  webServer: {
    enabled: boolean
    port: number
    host: string
  }
  ```

- [ ] **12.2** 更新配置加载逻辑读取 Web 配置
  - 修改 `src/config/loader.ts`
  - 默认值: port=10010, host=localhost

- [ ] **12.3** 在 init 命令中添加 Web 配置初始化
  - 询问是否启用 Web UI
  - 询问端口配置
  - 生成配置到 config.json

---

### Phase 2.2: CLI 守护进程命令 (P1)

- [ ] **4.1** 创建 `src/cli/commands/start.ts` 命令
  - 读取配置决定是否启动 Web 服务器
  - Fork 子进程运行 Web 服务器
  - 写入 PID 文件到 `~/.claude-evolution/daemon.pid`
  - 支持 `--port` 参数覆盖配置

- [ ] **4.4** 创建 `src/cli/commands/stop.ts` 命令
  - 读取 PID 文件
  - 发送 SIGTERM 信号
  - 等待进程退出
  - 清理 PID 文件

- [ ] **4.6** 创建 `src/cli/commands/status.ts` 命令
  - 检查 PID 文件是否存在
  - 验证进程是否运行
  - 显示服务器状态（运行中/已停止）
  - 显示端口和 URL

- [ ] **4.10** 实现优雅关闭逻辑（SIGTERM handler）
  - 捕获 SIGTERM 信号
  - 关闭 WebSocket 连接
  - 关闭 Express 服务器
  - 清理临时文件

**✅ 测试检查点 (1 小时)**:
```bash
# 守护进程测试
npm run test:daemon

测试用例:
- [ ] claude-evolution start 成功启动
- [ ] PID 文件正确创建
- [ ] claude-evolution status 显示运行中
- [ ] 浏览器可以访问 Web UI
- [ ] claude-evolution stop 优雅关闭
- [ ] PID 文件正确删除
- [ ] 再次 status 显示已停止
- [ ] 优雅关闭时无数据丢失

# 端口冲突测试
- [ ] 端口被占用时显示友好错误
- [ ] 建议使用 --port 参数
```

---

### Phase 2.3: 构建和部署配置 (P1)

- [ ] **12.4** 配置 Vite 生产构建输出到 `web/client/dist`
  - 已完成，验证即可

- [ ] **12.5** 配置 Express 静态文件服务
  - 已完成，验证即可

- [ ] **12.6** 实现 API 和静态文件路由优先级
  - API 路由优先
  - 静态文件次之
  - SPA 路由回退到 index.html

- [ ] **12.7** 更新 package.json scripts 添加 build:web
  ```json
  "build:web": "cd web/client && npm run build"
  ```

- [ ] **12.8** 更新 .gitignore 忽略构建产物
  - `web/client/dist/`
  - `web/server/dist/`

---

### Phase 2.4: 文档更新 (P1)

- [ ] **13.5** 更新 README 添加 Web UI 使用说明
  - 启动命令
  - 访问地址
  - 功能说明

- [ ] **13.8** 添加故障排查指南
  - 端口占用处理
  - 通知不显示
  - 数据加载失败

---

### Sprint 2 交付物

- ✅ `claude-evolution start` 启动 Web UI
- ✅ `claude-evolution stop` 优雅关闭
- ✅ `claude-evolution status` 查看状态
- ✅ 配置文件支持 Web 配置
- ✅ 守护进程测试通过

---

## 🎨 Sprint 3: 体验优化

**目标**: 完善 Settings 页面，优化 UI 交互

### Phase 3.1: Settings 页面实现 (P2)

- [ ] **8.1** 创建 Settings 页面骨架（替换占位内容）
  - 加载配置数据
  - 表单状态管理

- [ ] **8.2** 实现调度器配置区块
  - 启用/禁用开关
  - 间隔选择（6h/12h/24h）

- [ ] **8.3** 实现 LLM 配置区块
  - 模型选择下拉框
  - Max Tokens 输入
  - Temperature 滑块

- [ ] **8.4** 实现通知配置区块
  - 桌面通知启用/禁用
  - 事件订阅复选框

- [ ] **8.7** 实现"保存"按钮和批量保存逻辑
  - 调用 PATCH /api/config
  - 成功后 Toast 提示

- [ ] **8.9** 实现配置验证和错误提示
  - 前端验证（端口范围、必填项）
  - 后端验证错误显示

- [ ] **10.10** 在 Settings 页面添加通知启用/禁用开关
  - 已集成在 8.4 中

---

### Phase 3.2: Review 页面增强 (P2)

- [ ] **7.11** 实现搜索框和实时过滤
  - 搜索描述、问题、解决方案
  - 实时筛选列表

- [ ] **7.12** 实现类型筛选标签
  - All / Preference / Pattern / Workflow
  - 点击切换筛选

- [ ] **7.13** 实现排序下拉菜单
  - 按置信度排序
  - 按时间排序

- [ ] **7.8-7.10** 实现批量操作
  - 批量选择复选框
  - 批量操作固定栏
  - 批量批准功能

---

### Phase 3.3: UI 优化 (P2)

- [ ] **11.4** 实现加载骨架屏
  - Dashboard 加载时
  - Review 列表加载时

- [ ] **11.5** 实现空状态提示
  - 无建议时的友好提示
  - 引导用户运行分析

- [ ] **11.7** 添加操作确认对话框样式
  - 统一确认对话框组件
  - 拒绝建议时使用

---

### Phase 3.4: 补充测试 (P2)

- [ ] **13.1** 编写 API 端点单元测试
  - 关键 API 路由测试
  - 错误处理测试

- [ ] **13.2** 编写 WebSocket 连接测试
  - 连接/断开测试
  - 事件推送测试

- [ ] **13.3** 编写守护进程启停测试
  - 已在 Sprint 2 完成

- [ ] **13.4** 编写前端组件快照测试
  - Dashboard 快照
  - Review 卡片快照

---

### Sprint 3 交付物

- ✅ Settings 页面可用
- ✅ Review 页面支持搜索、筛选、排序
- ✅ UI 加载和空状态优化
- ✅ 测试覆盖率达到关键路径 100%

---

## 📦 Phase 4: 未来特性 (P3)

**这些功能不在当前 MVP 范围内，后续迭代考虑**

### History 页面 (P3)
- [ ] 9.1-9.8 完整 History 功能

### 高级 UI 优化 (P3)
- [ ] 11.1 终端风格配色方案（当前已是暗色主题）
- [ ] 11.2 配置 JetBrains Mono 等宽字体（已使用）
- [ ] 11.3 实现卡片 hover 效果和过渡动画
- [ ] 11.6 优化响应式布局（平板和桌面）

### 守护进程高级功能 (P3)
- [ ] 4.8-4.9 日志命令和实时跟踪
- [ ] 4.11-4.12 日志重定向和自动轮转

### 其他配置 (P3)
- [ ] 8.5 学习阶段配置区块
- [ ] 8.6 API 配置区块
- [ ] 8.8 Reset to Defaults 按钮

### 高级文档 (P3)
- [ ] 13.6 创建 WEB-UI-GUIDE.md 详细文档
- [ ] 13.7 更新命令行帮助文本

---

## 📊 进度总览

| Sprint | 目标 | 任务数 | 预计时间 | 状态 |
|--------|------|--------|----------|------|
| Sprint 1 | 核心可用性 | 12 | 2-3 天 | 🟡 进行中 |
| Sprint 2 | 生产化准备 | 11 | 1-2 天 | ⏸️  待开始 |
| Sprint 3 | 体验优化 | 15 | 1-2 天 | ⏸️  待开始 |
| Phase 4 | 未来特性 | 20+ | TBD | 📦 已规划 |

**当前总体进度**: 约 45% → 目标 80% (Sprint 1-3 完成)

---

## 🔍 关键测试检查点汇总

### Sprint 1 必须测试
1. **API 集成测试** (1 小时)
   - approve/reject API 正确性
   - 数据完整性验证
   - 并发安全测试

2. **核心流程 E2E 测试** (30 分钟)
   - 完整审核流程
   - Dashboard 实时刷新
   - WebSocket 推送验证

### Sprint 2 必须测试
1. **守护进程测试** (1 小时)
   - start/stop/status 命令
   - 优雅关闭
   - 端口冲突处理

### Sprint 3 可选测试
1. **单元测试补充**
2. **组件快照测试**

---

## 📝 备注

- **测试优先级**: 关键路径 100% > 边缘 case
- **文档优先级**: 用户指南 > 开发文档
- **性能测试**: 单用户工具，暂不考虑
- **国际化**: 已决定纯中文，无需 i18n 框架
