## 1. 配置 Schema 扩展

- [x] 1.1 在 `src/config/schema.ts` 中新增 `reminders` 配置段（enabled、channels.desktop.enabled、channels.websocket.enabled）
- [x] 1.2 在 `src/config/loader.ts` 中添加 migration 规则，为旧配置补充 reminders 默认值
- [x] 1.3 在前端 `web/client/src/api/client.ts` 的 Config 类型中同步新增 reminders 字段

## 2. 通知渠道抽象层

- [x] 2.1 创建 `src/notifications/channel.ts`，定义 `NotificationChannel` 接口和 `Notification` 类型
- [x] 2.2 创建 `src/notifications/desktop-channel.ts`，封装现有 `notifier.ts` 为 DesktopChannel
- [x] 2.3 创建 `src/notifications/websocket-channel.ts`，封装 WebSocketManager 为 WebSocketChannel
- [x] 2.4 创建 `src/notifications/dispatcher.ts`，实现多渠道并行分发，单渠道失败不影响其他

## 3. 提醒核心服务

- [x] 3.1 创建 `src/reminders/types.ts`，定义 Reminder 类型（id、message、triggerAt、schedule、type、createdAt、status）
- [x] 3.2 创建 `src/reminders/store.ts`，实现 reminders.json 的读写持久化（串行写入队列防并发）
- [x] 3.3 创建 `src/reminders/scheduler.ts`，实现基于 node-cron 的统一调度（一次性提醒转 cron 表达式，触发后自动移除）
- [x] 3.4 创建 `src/reminders/service.ts`，实现 ReminderService（create、delete、list、getById、recover）

## 4. REST API

- [x] 4.1 创建 `web/server/routes/reminders.ts`，实现 POST /api/reminders 端点（Zod 输入校验）
- [x] 4.2 实现 GET /api/reminders 端点（列表查询）
- [x] 4.3 实现 GET /api/reminders/:id 端点（详情查询）
- [x] 4.4 实现 DELETE /api/reminders/:id 端点
- [x] 4.5 在 `web/server/index.ts` 中挂载 reminders 路由

## 5. Daemon 集成

- [x] 5.1 在 `src/daemon/lifecycle.ts` 中初始化 ReminderService 和 NotificationDispatcher
- [x] 5.2 daemon 启动时调用 `reminderService.recover()` 恢复持久化提醒
- [x] 5.3 daemon 关闭时调用 `reminderService.shutdown()` 清理定时器
- [x] 5.4 将 ReminderService 实例注入 Express 路由中间件

## 6. Skill 文件

- [x] 6.1 创建 `skills/remind.md` Skill 文件，包含触发条件描述（中英文提醒意图识别）
- [x] 6.2 Skill 中编写 API 调用说明（curl POST 到 localhost:10010/api/reminders）
- [x] 6.3 Skill 中添加 daemon 可用性检查逻辑
- [x] 6.4 Skill 中添加成功/失败的用户反馈模板
- [x] 6.5 在 CLI init 命令中添加 Skill 文件安装逻辑（复制到 ~/.claude/skills/remind.md）

## 7. Web UI 展示

- [x] 7.1 创建 `web/client/src/pages/Reminders/` 页面组件，展示提醒列表
- [x] 7.2 实现提醒卡片组件（显示消息、时间、类型、删除按钮）
- [x] 7.3 实现手动创建提醒的表单（消息、时间选择）
- [x] 7.4 集成 WebSocket 监听 `reminder_triggered` 事件，实时更新 UI
- [x] 7.5 在路由中注册 Reminders 页面

## 8. 测试

- [ ] 8.1 为 ReminderService 编写单元测试（create、delete、list、recover）
- [ ] 8.2 为 NotificationDispatcher 编写单元测试（多渠道分发、单渠道失败隔离）
- [ ] 8.3 为 REST API 编写集成测试（CRUD 端点 + 输入校验）
- [ ] 8.4 为 Skill 安装逻辑编写测试（首次安装、版本更新、用户自定义跳过）
