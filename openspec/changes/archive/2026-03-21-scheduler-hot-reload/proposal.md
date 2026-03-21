## Why

用户通过 WebUI 修改调度器配置（如切换到定时模式、修改时间点）后，配置已写入磁盘但运行中的守护进程仍使用内存中的旧配置。调度器不会重载，用户看到"保存成功"但实际行为未变。这导致定时模式功能形同虚设，用户必须手动重启守护进程才能生效。

## What Changes

- 守护进程新增配置热加载能力：当 config 保存时，自动检测调度器相关字段变更并重启调度器
- API 端在保存配置后广播 `config_changed` WebSocket 事件
- 守护进程监听内部配置变更信号，执行调度器 stop → reload config → start 流程
- WebUI Settings 页面在保存成功后显示调度器已重载的反馈

## Capabilities

### New Capabilities
- `scheduler-hot-reload`: 守护进程在配置变更时自动重载调度器，无需手动重启

### Modified Capabilities
- `periodic-session-analyzer`: 新增场景 —— 用户通过 WebUI 修改调度器配置后，调度器立即按新配置运行

## Impact

- `src/daemon/daemon-process.ts` — 新增配置变更监听和调度器重载逻辑
- `src/scheduler/cron-scheduler.ts` — 可能需要暴露 reload 方法或确保 stop/start 幂等
- `web/server/routes/system.ts` — 配置保存后触发通知
- `web/server/notifications.ts` — 确认 `notifyConfigChanged` 已正确实现
- `web/client/src/pages/Settings.tsx` — 保存后显示调度器重载反馈
