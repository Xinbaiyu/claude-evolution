## Tasks

### Phase 1: CC 执行器

- [x] 1.1 创建 `src/bot/cc-executor.ts` — 封装 `child_process.spawn('claude', ...)` 调用，JSON 输出解析，超时控制，错误处理
- [x] 1.2 创建 `src/bot/path-resolver.ts` — 从消息中提取工作目录 + 白名单验证

### Phase 2: Bridge Handler

- [x] 2.1 创建 `src/bot/commands/cc-bridge.ts` — CCBridgeHandler 替代 ChatCommand 作为 fallback
  - 解析工作目录
  - 白名单验证
  - 注入群聊上下文为 system prompt
  - spawn CC 子进程
  - 推送结果
- [x] 2.2 修改 `src/bot/index.ts` — fallback 从 ChatCommand 换成 CCBridgeHandler

### Phase 3: 配置

- [x] 3.1 扩展 `src/config/schema.ts` — BotConfigSchema 新增 `cc` 段（defaultCwd、allowedDirs、timeoutMs、maxBudgetUsd、permissionMode）
- [x] 3.2 修改 `web/client/src/api/client.ts` — Config 接口新增 bot.cc 字段
- [x] 3.3 修改 `web/client/src/pages/Settings.tsx` — 机器人配置区新增 CC 桥接设置（默认目录、白名单、超时、预算）

### Phase 4: 测试

- [x] 4.1 创建 `tests/bot/cc-executor.test.ts` — CC 执行器测试（mock child_process，超时、JSON 解析、错误处理）
- [x] 4.2 创建 `tests/bot/path-resolver.test.ts` — 路径解析 + 白名单测试
- [x] 4.3 创建 `tests/bot/cc-bridge.test.ts` — Bridge handler 集成测试
