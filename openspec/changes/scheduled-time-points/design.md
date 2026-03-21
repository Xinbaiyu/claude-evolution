## Context

当前 `CronScheduler` 通过 `node-cron` 库实现定时调度，支持三种预设间隔（6h/12h/24h）和自定义 cron 表达式。配置存储在 `~/.claude-evolution/config.json` 的 `scheduler` 字段中。用户通过 `init` 命令或 WebUI Settings 页面配置调度参数。

现有配置结构：
```typescript
scheduler: {
  enabled: boolean        // 是否启用
  interval: '6h' | '12h' | '24h' | 'custom'
  customCron?: string     // 自定义 cron
  runOnStartup: boolean
  notifications: { enabled, onSuccess, onFailure }
}
```

用户希望能指定"每天的哪些时间点执行分析"，而非固定间隔。

## Goals / Non-Goals

**Goals:**
- 支持用户配置多个具体时间点（HH:MM 格式）作为分析触发时间
- `init` 命令交互中提供定时模式选项
- WebUI Settings 页面提供时间点的增删改 UI
- Dashboard 状态展示适配新模式
- 完全向后兼容现有 interval 配置

**Non-Goals:**
- 不支持按星期几/日期过滤（仅每日重复）
- 不支持不同时间点执行不同类型的分析
- 不做时区配置 UI（使用系统本地时区）

## Decisions

### D1: 配置结构设计

`interval` 字段增加 `'timepoints'` 选项，新增 `scheduleTimes` 数组字段：

```typescript
scheduler: {
  enabled: boolean
  interval: '6h' | '12h' | '24h' | 'timepoints' | 'custom'
  scheduleTimes?: string[]    // ["06:00", "07:00", "13:00", "16:00"]
  customCron?: string
  runOnStartup: boolean
  notifications: { ... }
}
```

**为什么不用 cron 表达式数组？** 用户不需要理解 cron 语法，`HH:MM` 格式直观易懂，且 init 命令和 WebUI 都更容易处理。内部实现时将 `HH:MM` 转换为 cron 表达式。

### D2: CronScheduler 多任务支持

当 `interval === 'timepoints'` 时，为每个时间点创建独立的 `cron.ScheduledTask`。`CronScheduler` 内部从单 task 改为 task 数组：

```typescript
private tasks: cron.ScheduledTask[] = [];
```

每个时间点 `"HH:MM"` 转换为 cron 表达式 `MM HH * * *`，例如 `"13:00"` → `"0 13 * * *"`。

**为什么不合并为一个 cron 表达式？** `node-cron` 不支持 `0 6,7,13,16 * * *` 这种逗号分隔的小时列表中混合不同分钟。分开创建更可靠。

### D3: init 命令交互流程

在分析频率选择步骤，增加"定时模式"选项：

```
分析频率:
  1) 每 24 小时 (推荐)
  2) 每 12 小时
  3) 每 6 小时
  4) 定时模式 (指定每天的具体时间)
```

选择定时模式后，提示用户输入时间点（逗号分隔）：

```
请输入分析时间点 (HH:MM格式，逗号分隔):
> 06:00, 13:00, 16:00
```

### D4: WebUI Settings 调度器 Tab 改造

调度器 Tab 中：
- 将"分析间隔"下拉框改为"调度模式"，选项包含间隔模式和定时模式
- 选择定时模式时，隐藏间隔选择，显示时间点列表编辑器
- 时间点编辑器：列表展示 + 添加按钮 + 每项带删除按钮
- 添加时使用 `<input type="time">` 原生时间选择器

### D5: Dashboard 状态展示

`GET /api/daemon/status` 返回的 `scheduler` 对象中：
- 新增 `mode: 'interval' | 'timepoints'` 字段
- 新增 `scheduleTimes?: string[]` 字段
- `nextAnalysis` 计算逻辑适配：找到当天或次日最近的时间点

## Risks / Trade-offs

- **时间点过多导致频繁分析** → 前端和 schema 验证限制最多 12 个时间点
- **时间点格式解析错误** → schema 用正则验证 `HH:MM` 格式，CronScheduler 做二次校验
- **Daemon 重启后时间点丢失** → 配置持久化在 config.json，重启后从配置读取重建所有 cron 任务
- **多个时间点同时触发** → 复用现有的分析互斥锁机制（analysisInProgress 标志），防止并发
