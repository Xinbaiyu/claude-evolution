## Why

当前调度器只支持固定间隔模式（6h/12h/24h），无法满足用户在特定时间点执行分析的需求。例如用户可能希望在上班前（6:00）、午休后（13:00）、下班前（16:00）执行分析，而不是每隔固定时间运行。增加定时时间点模式让用户能更精确地控制分析时机。

## What Changes

- 新增调度模式 `timepoints`，允许用户配置多个具体时间点（如 `["06:00", "07:00", "13:00", "16:00"]`）
- 修改 `SchedulerSchema` 配置，增加 `scheduleTimes` 字段
- 改造 `CronScheduler`，当模式为 `timepoints` 时为每个时间点创建独立的 cron 任务
- `init` 命令增加调度模式选择（间隔模式 / 定时模式），定时模式下让用户输入时间点列表
- WebUI 设置页面增加调度模式切换和时间点编辑 UI（可添加/删除时间点）
- Dashboard 状态展示适配新模式，显示所有计划时间点和下次执行时间

## Capabilities

### New Capabilities
- `scheduler-timepoints`: 支持用户配置多个具体时间点触发分析的调度模式，包括配置 schema、调度器引擎改造、CLI init 交互、WebUI 设置界面

### Modified Capabilities
- `periodic-session-analyzer`: 调度配置结构变更，新增 `interval` 值 `timepoints` 和 `scheduleTimes` 字段，影响现有调度器启动逻辑

## Impact

- **配置**: `~/.claude-evolution/config.json` 的 `scheduler` 结构扩展
- **后端**: `src/config/schema.ts`, `src/scheduler/cron-scheduler.ts`, `src/cli/commands/init.ts`, `src/daemon/daemon-process.ts`
- **前端**: `web/client/src/pages/Settings.tsx`
- **API**: `GET /api/daemon/status` 返回值需适配新模式（显示时间点列表和下次执行时间）
- **兼容性**: 现有 `interval: '6h'|'12h'|'24h'|'custom'` 配置完全向后兼容
