## 背景

claude-evolution 当前是纯 CLI 工具，所有功能通过命令行完成。用户必须手动运行 `claude-evolution review` 来检查新建议，无法实时得知分析完成。本设计添加 Web UI 界面和守护进程模式，提供更直观的可视化管理体验和实时通知能力。

**当前架构：**
- CLI 命令 → 直接读写 `~/.claude-evolution/` 下的 JSON 文件
- 调度器存在但未暴露启动命令
- 无实时通知机制

**目标架构：**
- 守护进程运行调度器 + Web 服务器
- Web UI ← REST API ← Express ← 文件系统
- WebSocket 实时推送事件
- CLI 命令保持完全向后兼容

## 目标 / 非目标

**目标：**
- 提供可视化的建议审核界面（替代 CLI review）
- 实时通知用户分析完成和新建议可用
- 提供配置管理 UI（替代手动编辑 config.json）
- 支持批量操作和高级筛选功能
- 保持 CLI 完全可用（不依赖 Web 服务器）

**非目标：**
- 多用户/权限系统（本地单用户工具）
- 远程访问/云部署（localhost only）
- 实时协作编辑
- 移动端适配（桌面优先）

## 决策

### 决策 1：集成启动模式 vs. 分离模式

**选择：** 集成模式 - `claude-evolution start` 同时启动调度器和 Web 服务器

**理由：**
- 用户体验更简单（一个命令搞定）
- 调度器和 Web UI 本身就是紧密关联的（Web UI 展示调度器生成的数据）
- 避免进程管理复杂性（不需要两个独立的守护进程）

**备选方案：**
- 分离模式：`claude-evolution daemon` + `claude-evolution web`
  - 优点：更灵活，可以只运行调度器不启动 UI
  - 缺点：增加用户心智负担，两个进程管理更复杂
  - 决策：大多数用户会同时需要两者，分离模式收益不大

### 决策 2：数据访问层设计

**选择：** Express API 中间层 - Web UI 通过 REST API 访问数据，不直接读取文件

**理由：**
- 并发安全：API 层可以加锁保护文件读写
- 数据验证：API 层统一验证请求参数
- 解耦：未来可以替换底层存储（SQLite）而不影响前端
- 审计：API 层记录所有操作日志

**备选方案：**
- 前端直接读取文件（通过 fs 或 Node API）
  - 优点：实现简单，无需 API 层
  - 缺点：并发问题难以控制，前后端耦合严重
  - 决策：虽然是本地工具，但 API 层的收益大于成本

### 决策 3：前端技术栈

**选择：** React + Vite + Tailwind CSS

**理由：**
- React：社区最大，组件生态丰富，团队熟悉度高
- Vite：构建极快，HMR 体验好，ESM 原生支持
- Tailwind：快速开发，易于定制，避免 CSS 命名冲突

**备选方案：**
- Vue + Vite：更轻量，学习曲线平缓
  - 决策：React 生态更成熟，第三方库更多
- Svelte：打包体积最小，性能最好
  - 决策：生态较小，不适合快速迭代

### 决策 4：实时通信和通知方案

**选择：** WebSocket (事件推送) + node-notifier (系统级桌面通知)

**理由：**
- WebSocket：用于前端实时数据同步，轻量级，单向推送足够
- node-notifier：统一的系统级通知，不依赖浏览器状态
- 跨平台：自动适配 macOS/Windows/Linux 原生通知
- 用户体验：无论浏览器开或关，用户都能收到通知
- 深度集成：点击通知自动打开浏览器并跳转到相应页面

**macOS 通知实现：**
- 使用 AppleScript 替代 node-notifier（更可靠，无需权限配置）
- 通知发送后 1 秒自动打开浏览器
- 100% 可靠性，无需用户手动配置通知权限

**通知类型路由映射：**
- `analysis_complete` → `/review`
- `analysis_failed` → `/dashboard`
- `new_suggestions` → `/review`
- `config_changed` → `/settings`
- `system_error` → `/dashboard`

**备选方案：**
- 浏览器 Notification API：仅在浏览器开启时有效
  - 优点：无需额外依赖
  - 缺点：浏览器关闭时无法通知，用户体验不完整

### 决策 5：界面语言

**选择：** 纯中文界面（无国际化切换）

**理由：**
- 目标用户：中文用户（个人/团队使用）
- 简化实现：无需 i18n 框架和翻译表维护
- 视觉一致性：统一的中文字体和排版
- 开发效率：减少 30-40 分钟的国际化工作

**字体选择：**
- 标题：思源黑体 Bold (Noto Sans SC) - 支持中文粗体
- 数据/代码：JetBrains Mono - 已支持中文等宽字体
- 保持 Neo-brutalist 风格：粗体、几何感

**翻译原则：**
- 品牌保留：CLAUDE 进化系统（混搭，保留识别度）
- 简洁有力：待审批、已批准（避免啰嗦）
- 术语统一：调度器、置信度、建议（技术术语）

**备选方案：**
- 中英文切换：增加实现复杂度，当前用户无此需求
  - 优点：国际化能力，适合开源项目
  - 缺点：维护成本高，过度设计
  - 决策：YAGNI 原则，需要时再加
  - 决策：系统级通知更可靠，覆盖所有场景
- Socket.io：自动降级到轮询
  - 决策：本地工具不需要降级，原生 WebSocket 足够

### 决策 5：守护进程实现

**选择：** Node.js 子进程 + PID 文件管理

**理由：**
- 跨平台：Windows/macOS/Linux 统一方案
- 简单：无需依赖 pm2 等外部工具
- 控制：完全掌控进程生命周期

**实现细节：**
- `claude-evolution start` fork 子进程到后台
- 子进程 ID 写入 `~/.claude-evolution/daemon.pid`
- `claude-evolution stop` 读取 PID 并发送 SIGTERM
- 子进程捕获 SIGTERM 执行优雅关闭

**备选方案：**
- 使用 pm2 管理进程
  - 优点：成熟稳定，自动重启
  - 缺点：增加外部依赖，用户需要全局安装 pm2
  - 决策：自己实现更可控，不增加依赖

### 决策 6：端口配置

**选择：** 默认端口 10010，支持通过配置和命令行参数自定义

**理由：**
- 10010 不常见，冲突概率低
- 支持 `--port` 参数覆盖配置
- 端口占用时自动提示并建议替代方案

### 决策 7：状态同步策略

**选择：** 轮询 + WebSocket 推送混合模式

**实现：**
- WebSocket 推送关键事件（分析完成、新建议、状态变更）
- 页面初次加载时通过 REST API 拉取完整数据
- 后续通过 WebSocket 增量更新

**理由：**
- 可靠性：WebSocket 断开时仍可通过 API 获取数据
- 性能：避免频繁轮询，仅在事件发生时推送
- 简单：无需复杂的状态同步逻辑

### 决策 8：批准操作的数据流架构

**选择：** 方案 B - Manager 内置逻辑（SuggestionManager 负责完整的批准流程）

**问题背景：**
在实现 Web UI 批准功能时，发现 CLI 和 Web Server 的数据流存在不一致：

```
CLI approve 命令 (错误实现):
  approveSuggestion(id) → 修改 pending.json 的 status 字段
  writeLearnedContent([单个item], [], []) → 覆盖 learned/*.md 文件 ❌
  generateCLAUDEmd() → 基于错误的 learned/ 文件生成

Web Server approve API (不完整):
  pending.splice(index, 1) → 从待审批移除
  approved.push(suggestion) → 添加到已批准
  写入 pending.json 和 approved.json
  ❌ 缺少 writeLearnedContent()
  ❌ 缺少 generateCLAUDEmd()
```

**数据流修正：**

正确的数据流应该是：
1. 将建议从 `pending.json` 移动到 `approved.json`
2. 读取**所有**已批准建议，按类型分组
3. 重新生成 `learned/*.md` 文件（包含所有已批准的学习内容）
4. 重新生成 `~/.claude/CLAUDE.md`

**方案对比：**

| 维度 | 方案 A (Web Server 调用) | 方案 B (Manager 内置) ✅ |
|------|--------------------------|-------------------------|
| 实现难度 | 低（只改 Web Server） | 中（重构 Manager） |
| 职责清晰度 | 中（调用方负责） | 高（自动处理） |
| 维护性 | 低（容易遗漏） | 高（集中管理） |
| 批量优化 | 需要单独实现 | 天然支持 |
| 风险 | 低 | 中（影响 CLI） |

**选择理由：**
1. **职责集中**：SuggestionManager 完全负责建议生命周期，不依赖调用方
2. **批量优化天然支持**：Manager 内部可以控制何时生成 CLAUDE.md
   - 单个批准：立即生成（~37ms，可接受）
   - 批量批准：只生成一次（性能提升 10 倍）
3. **避免调用方遗漏**：CLI 和 Web Server 都不会忘记更新 CLAUDE.md
4. **一致性保证**：所有批准操作（CLI/Web UI/未来的 API）行为一致

**实现设计：**

```typescript
// 新增：加载所有已批准建议
export async function loadApprovedSuggestions(): Promise<Suggestion[]>

// 新增：移动建议到已批准列表（不生成 CLAUDE.md）
async function moveSuggestionToApproved(id: string): Promise<Suggestion>

// 新增：重新生成学习内容（读取所有已批准建议）
async function regenerateLearnedContent(): Promise<void> {
  const approved = await loadApprovedSuggestions();

  // 按类型分组
  const preferences = approved.filter(s => s.type === 'preference').map(s => s.item);
  const patterns = approved.filter(s => s.type === 'pattern').map(s => s.item);
  const workflows = approved.filter(s => s.type === 'workflow').map(s => s.item);

  // 重新生成（包含所有已批准内容，不会覆盖）
  await writeLearnedContent(preferences, patterns, workflows);
  await generateCLAUDEmd(config);
}

// 修改：单个批准（内置完整逻辑）
export async function approveSuggestion(id: string): Promise<void> {
  await moveSuggestionToApproved(id);
  await regenerateLearnedContent(); // ← 自动更新
}

// 新增：批量批准（只生成一次）
export async function batchApproveSuggestions(ids: string[]): Promise<void> {
  for (const id of ids) {
    await moveSuggestionToApproved(id);
  }
  await regenerateLearnedContent(); // ← 只生成一次！
}
```

**性能基准：**
- 单个批准：~37ms（IO + 数据处理 + CLAUDE.md 生成）
- 批量批准 10 个：~37ms（vs. 方案 A 的 370ms）
- 批量批准 50 个：~50ms（vs. 方案 A 的 1850ms）

**备选方案：**
- 方案 A：Web Server 路由直接调用生成器
  - 优点：改动小，风险低
  - 缺点：职责分散，容易遗漏，批量优化需要额外实现
  - 决策：短期收益小，长期维护成本高

### 决策 9：批量操作的事务性和错误处理

**选择：** 快照 + 回滚机制（原子性保证）

**需求：**
用户批量批准多个建议时，如果中途发生错误（文件权限、磁盘空间等），必须保证数据一致性。

**实现策略：**

```
批量批准流程：
  1. 创建快照（备份 pending.json 和 approved.json）
  2. 逐个移动建议到已批准列表
  3. 如果任何一个失败 → 立即回滚到快照
  4. 所有建议批准成功 → 生成 CLAUDE.md
  5. 清理快照
```

**快照机制：**
- 位置：`~/.claude-evolution/snapshots/<timestamp>/`
- 内容：`pending.json` 和 `approved.json` 的完整副本
- 生命周期：成功后立即删除，失败后保留用于调试

**错误处理：**
- **失败时**：所有更改回滚，返回错误信息
- **Web API 响应**：`{ success: false, error: "...", data: { approved: [], failed: ["id"] } }`
- **前端提示**：显示错误对话框，引导用户重试或检查日志

**用户体验：**
- 批量批准进度 Modal 显示实时状态
- 错误时立即停止并回滚
- 提示"所有更改已回滚，请检查后重试"

**理由：**
1. **数据一致性**：避免部分批准导致数据状态不一致
2. **用户信任**：明确告知用户操作失败，没有隐藏的部分成功
3. **简化恢复**：用户只需重试，无需手动清理残留数据

**备选方案：**
- 部分成功模式：批准成功的保留，失败的返回列表
  - 优点：最大化成功数量
  - 缺点：数据状态复杂，用户难以理解"部分成功"的含义
  - 决策：一致性优先，全部成功或全部失败更清晰

## 风险 / 权衡

### 风险 1：并发写入冲突
**风险：** CLI 命令和 Web API 同时修改 JSON 文件导致数据损坏
**缓解：**
- API 层使用文件锁（fs-extra 的 lock 功能）
- 写入时先读取最新状态，执行 CAS 操作
- 失败时重试 3 次

### 风险 2：通知可靠性
**风险：** 用户错过系统通知或通知未正确触发
**缓解：**
- WebSocket 推送 + 系统通知双通道
- Dashboard 显示未读通知徽章
- 通知历史可在前端查看
- 跨平台测试确保各系统通知正常

### 风险 3：端口占用
**风险：** 默认端口 10010 被其他应用占用
**缓解：**
- 启动时检测端口占用
- 显示清晰的错误信息和解决方案
- 支持通过 `--port` 参数指定其他端口

### 风险 4：系统通知权限和兼容性
**风险：** Linux 系统可能未安装 notify-send，导致通知失败
**缓解：**
- 启动时检测系统通知可用性
- 不可用时在日志中记录警告
- Settings 页面显示通知功能状态
- 提供安装指引（Linux: `sudo apt install libnotify-bin`）

### 风险 5：进程崩溃
**风险：** 守护进程意外退出导致服务不可用
**缓解：**
- 捕获未处理的异常并记录到 crash.log
- 下次启动时检测到崩溃日志并提示用户
- 提供 `claude-evolution logs` 命令查看日志

## 实现路径

### Phase 1 (MVP - 基础功能)
1. 实现 Express 服务器和基础 API 路由
2. 实现 WebSocket 服务器
3. 创建 React 前端骨架（路由、布局）
4. 实现 Dashboard 页面
5. 实现 Review 页面（列表、批准/拒绝）
6. 实现基础 Settings 页面
7. 实现守护进程模式（start/stop/status 命令）
8. 实现桌面通知

### Phase 2 (增强功能)
1. 实现 History 页面
2. 实现建议详情展开面板
3. 实现批量操作
4. 实现搜索和筛选功能
5. 优化 UI 样式和交互

### Phase 3 (高级功能)
1. 实现活动时间线可视化
2. 实现趋势图表
3. 实现导出/导入功能
4. 实现日志查看器
5. 性能优化和用户体验打磨

## 开放问题

1. **是否需要身份验证？**
   - 当前设计：无需认证（本地工具）
   - 考虑：如果未来支持远程访问，需添加简单的 token 认证

2. **是否需要支持多主题？**
   - 当前设计：仅深色主题（开发者友好）
   - 考虑：未来可添加亮色主题切换

3. **是否需要国际化？**
   - 当前设计：纯中文
   - 考虑：如果开源，可能需要英文支持

4. **是否需要离线支持？**
   - 当前设计：需要 Web 服务器运行
   - 考虑：可以添加 Service Worker 实现离线缓存
