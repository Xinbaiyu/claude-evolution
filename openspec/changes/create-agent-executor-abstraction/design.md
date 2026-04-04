## Context

当前系统中所有需要执行 Claude Code CLI 的场景都直接调用底层的 `executeCC()` 函数，每次调用都需要手动传递配置参数：

**当前调用方式**（`cc-bridge.ts:89-97`）：
```typescript
const result = await executeCC({
  prompt,
  cwd,
  timeoutMs: ccConfig.timeoutMs || 120_000,
  maxBudgetUsd: ccConfig.maxBudgetUsd || 0.5,
  systemPrompt,
  permissionMode: ccConfig.permissionMode || 'bypassPermissions',
  baseURL: ccConfig.baseURL,
});
```

**问题**：
1. 配置参数分散在多处（bot.cc、未来的 agent 配置）
2. 每个调用方都要重复读取配置、设置默认值
3. 参数验证逻辑（如目录白名单）需要在每个调用方重复实现
4. 难以统一添加日志、监控、错误处理等横切关注点

**依赖前置**：
此 change 依赖 `refactor-agent-config-to-unified-execution`，需要 `config.agent` 已经存在。

## Goals / Non-Goals

**Goals:**
- 创建统一的 AgentExecutor 抽象层，封装配置读取和执行逻辑
- 简化调用方代码，只需提供业务参数（prompt、systemPrompt）
- 支持定时 Agent 任务（通过 reminders 系统）
- 提供单例模式的全局访问点
- 保持与现有 `executeCC()` 的兼容性

**Non-Goals:**
- 不修改 `executeCC()` 的底层实现
- 不实现 WebUI 手动触发、Webhook 触发、CLI 命令（留待将来扩展）
- 不改变 `config.agent` 的结构（由前置 change 定义）

## Decisions

### 决策 1：类设计 - AgentExecutor 类

**选择**：创建有状态的 AgentExecutor 类，持有配置引用

```typescript
export class AgentExecutor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async execute(options: AgentExecuteOptions): Promise<AgentExecuteResult> {
    // 从 this.config.agent 读取配置
    // 调用 executeCC()
  }

  async reloadConfig(): Promise<void> {
    // 热更新配置
  }
}
```

**理由**：
- 配置可以缓存，避免每次调用都读文件
- 支持配置热更新（reloadConfig）
- 易于测试（可以注入 mock config）

**备选方案（已否决）**：
```typescript
// 方案 A：纯函数式
async function executeAgent(prompt: string) {
  const config = await loadConfig();  // 每次都读文件
  // ...
}
```
- 否决理由：性能差，每次都读配置文件

---

### 决策 2：工厂模式 - 单例 vs 多实例

**选择**：单例模式 + 工厂函数

```typescript
let globalExecutor: AgentExecutor | null = null;

export async function getAgentExecutor(): Promise<AgentExecutor> {
  if (!globalExecutor) {
    const config = await loadConfig();
    globalExecutor = new AgentExecutor(config);
  }
  return globalExecutor;
}
```

**理由**：
- 大多数场景不需要多实例
- 全局共享配置，减少内存占用
- 简化调用方代码

**备选方案（已否决）**：
```typescript
// 方案 B：每次创建新实例
export async function createAgentExecutor() {
  return new AgentExecutor(await loadConfig());
}
```
- 否决理由：浪费资源，配置不需要隔离

---

### 决策 3：参数设计 - 最小化必需参数

**选择**：只有 `prompt` 必需，其他都可选

```typescript
export interface AgentExecuteOptions {
  prompt: string;               // 必需
  systemPrompt?: string;        // 可选
  cwd?: string;                 // 可选，默认用 config.agent.defaultCwd
}
```

**理由**：
- 符合"最少惊讶原则"，调用方只关心业务逻辑（prompt）
- 配置都在 config.agent 中，调用时不需要重复指定
- `cwd` 可选覆盖，支持特殊场景

**备选方案（已否决）**：
```typescript
// 方案 A：要求传所有参数
interface AgentExecuteOptions {
  prompt: string;
  cwd: string;           // 必需
  timeout: number;       // 必需
  budget: number;        // 必需
}
```
- 否决理由：失去了封装的意义

---

### 决策 4：定时任务设计 - 扩展 Reminder 类型

**选择**：在 Reminder 类型中添加 `taskType` 判别字段

```typescript
export type ReminderTaskType = 'notification' | 'agent-task';

export interface Reminder {
  // 现有字段
  id: string;
  type: 'one-shot' | 'recurring';
  createdAt: string;
  status: ReminderStatus;

  // 新增字段
  taskType: ReminderTaskType;

  // 联合类型字段（根据 taskType 决定哪个有值）
  message?: string;           // taskType='notification' 时使用
  agentTask?: {               // taskType='agent-task' 时使用
    prompt: string;
    cwd?: string;
  };

  // 调度字段
  triggerAt?: string;
  schedule?: string;
  cronExpression: string;
}
```

**理由**：
- 复用现有的提醒调度基础设施（cron、存储、API）
- 清晰的类型区分（notification vs agent-task）
- 向后兼容（现有 notification 类型不受影响）

**备选方案（已否决）**：
```typescript
// 方案 A：创建独立的 AgentTask 系统
interface AgentTask {
  id: string;
  prompt: string;
  schedule: string;
}
```
- 否决理由：重复实现调度逻辑，代码冗余

---

### 决策 5：错误处理策略

**选择**：AgentExecutor 内部捕获所有错误，返回统一的 Result 对象

```typescript
async execute(options: AgentExecuteOptions): Promise<AgentExecuteResult> {
  try {
    // 验证配置
    if (!this.config.agent) {
      return { success: false, error: 'Agent config not found', durationMs: 0 };
    }

    // 验证目录白名单
    if (!this.isPathAllowed(cwd)) {
      return { success: false, error: `Path not allowed: ${cwd}`, durationMs: 0 };
    }

    // 执行
    return await executeCC({ ... });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: 0,
    };
  }
}
```

**理由**：
- 调用方不需要 try-catch
- 统一的错误返回格式
- 便于日志记录和监控

**备选方案（已否决）**：
- 直接抛出异常，让调用方处理
  - 否决理由：增加调用方负担

---

### 决策 6：配置热更新机制 - 回调注册模式

**选择**：采用回调注册模式，与 Scheduler 热更新机制一致

**实现示例**（`web/server/index.ts`）：
```typescript
// 回调注册
let agentConfigChangedCallback: (() => Promise<void>) | null = null;

export function onAgentConfigChanged(callback: () => Promise<void>): void {
  agentConfigChangedCallback = callback;
}

export function triggerAgentConfigChanged(): void {
  if (agentConfigChangedCallback) {
    agentConfigChangedCallback().catch((error) => {
      logger.error('Failed to reload agent config:', error);
    });
  }
}
```

**生命周期集成**（`daemon/lifecycle.ts`）：
```typescript
import { onAgentConfigChanged } from '../web/server/index.js';
import { getAgentExecutor } from '../agent/executor.js';

export function createReloadAgentExecutor(): () => Promise<void> {
  return async () => {
    logger.info('Reloading AgentExecutor due to config change');
    const executor = await getAgentExecutor();
    await executor.reloadConfig();
    logger.info('AgentExecutor reloaded successfully');
  };
}

// daemon startup 注册回调
onAgentConfigChanged(createReloadAgentExecutor());
```

**配置保存时触发**（`web/server/routes/system.ts`）：
```typescript
const agentChanged = updates.agent !== undefined;
if (agentChanged) {
  triggerAgentConfigChanged();
}
```

**理由**：
- 与现有 Scheduler 热更新机制一致（参考 `onSchedulerConfigChanged`）
- 无需每次调用 `execute()` 都重新读取配置
- 配置更新立即生效，无需重启 daemon
- 解耦配置变更检测和执行器更新逻辑
- 已在生产环境验证（Scheduler 使用相同模式）

**备选方案（已否决）**：
```typescript
// 方案 A：每次 execute() 时检查配置是否变化
async execute(options: AgentExecuteOptions): Promise<AgentExecuteResult> {
  if (configFileModifiedSince(this.configLoadTime)) {
    await this.reloadConfig();
  }
  // ...
}
```
- 否决理由：性能开销大，每次执行都要检查文件修改时间

```typescript
// 方案 B：自动监听 config.json 文件变化
const watcher = fs.watch(configPath, () => {
  this.reloadConfig();
});
```
- 否决理由：文件监听复杂度高，与现有架构不一致

---

## Risks / Trade-offs

### 风险 1：依赖前置 change

**风险**：此 change 依赖 `config.agent` 存在，如果前置 change 未完成，无法实施

**缓解措施**：
- 在 proposal 中明确标注依赖关系
- 实施前确认前置 change 已合并
- 单元测试中 mock `config.agent`，不依赖真实配置

---

### 风险 2：单例模式的配置更新

**风险**：单例模式下，配置更新需要手动调用 `reloadConfig()`，可能忘记

**缓解措施**（已实现）：
- 采用回调注册模式，配置保存时自动触发热更新
- 在 `routes/system.ts` 中检测 `config.agent` 变化并自动触发
- 与 Scheduler 热更新机制保持一致
- 更新失败会记录错误日志，不影响主流程

---

### 风险 3：定时任务失败处理

**风险**：Agent 任务执行失败时，用户可能收不到通知

**缓解措施**：
- 无论成功失败都发送通知
- 失败通知包含错误详情
- 记录执行日志到文件

---

### Trade-off：抽象层开销

**代价**：增加了一层抽象，调试时多一层调用栈

**收益**：代码简洁性、可维护性大幅提升

**判断**：收益 >> 代价，接受这个 trade-off

---

## Migration Plan

### 阶段 1：创建 AgentExecutor（无影响）

1. 创建 `src/agent/executor.ts` 和 `src/agent/types.ts`
2. 实现 AgentExecutor 类和 getAgentExecutor() 工厂
3. 单元测试覆盖

**验证**：运行单元测试

---

### 阶段 2：改造钉钉机器人（可能影响）

1. 修改 `cc-bridge.ts` 使用 AgentExecutor
2. 保留原有功能不变

**验证**：手动测试钉钉机器人功能

---

### 阶段 3：扩展提醒系统（新功能）

1. 扩展 `reminders/types.ts` 添加 `agent-task` 类型
2. 修改 `reminders/service.ts` 支持 Agent 任务执行
3. 扩展 API 端点

**验证**：创建测试用的定时 Agent 任务

---

### Rollback 策略

如果发现严重问题：

1. **AgentExecutor**：移除新文件，不影响现有功能
2. **钉钉机器人**：恢复 `cc-bridge.ts` 旧代码
3. **提醒系统**：新功能可直接禁用（前端隐藏 agent-task 创建入口）

---

## Open Questions

1. **是否需要支持并发限制？**
   - 问题：同时触发多个 Agent 任务时，是否需要排队？
   - 建议：暂不实现，将来如有需要可在 AgentExecutor 内部添加队列

2. **执行结果是否需要持久化？**
   - 问题：Agent 任务的执行历史是否需要保存到数据库？
   - 建议：暂不实现，先通过通知系统发送结果

3. **是否需要支持任务取消？**
   - 问题：长时间运行的 Agent 任务能否中途取消？
   - 建议：暂不实现，通过 timeout 控制即可
