## 1. 配置 Schema 扩展

- [x] 1.1 修改 `src/config/schema.ts` 中的 `SchedulerSchema`：`interval` 增加 `'timepoints'` 选项，新增 `scheduleTimes` 字段（`z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(12).optional()`）
- [x] 1.2 更新 `DEFAULT_CONFIG` 中 `scheduler` 的默认值，确保 `scheduleTimes` 不影响现有配置

## 2. CronScheduler 改造

- [x] 2.1 修改 `src/scheduler/cron-scheduler.ts`：`task` 字段改为 `tasks: cron.ScheduledTask[]` 数组
- [x] 2.2 新增 `timeToClonExpression(time: string): string` 方法，将 `"HH:MM"` 转换为 cron 表达式 `"MM HH * * *"`
- [x] 2.3 修改 `start()` 方法：当 `interval === 'timepoints'` 时，遍历 `scheduleTimes` 创建多个 cron 任务
- [x] 2.4 修改 `stop()` 方法：停止并清理所有 tasks
- [x] 2.5 新增 `getNextTimepointExecution(scheduleTimes: string[]): string` 方法，计算下一个最近的时间点
- [x] 2.6 新增并发保护：若分析正在运行，跳过本次触发并打印日志

## 3. Init 命令改造

- [x] 3.1 修改 `src/cli/commands/init.ts` 的分析频率选择步骤：增加"定时模式 (指定每天的具体时间)"选项
- [x] 3.2 选择定时模式后，提示用户输入 HH:MM 格式时间点（逗号分隔），做格式校验，校验失败重新提示
- [x] 3.3 将解析后的时间点数组写入 `config.scheduler.scheduleTimes`，`interval` 设为 `"timepoints"`

## 4. WebUI Settings 页面改造

- [x] 4.1 修改 `web/client/src/pages/Settings.tsx` 调度器 Tab：将"分析间隔"下拉框改为"调度模式"选择器，增加"定时模式"选项
- [x] 4.2 选择定时模式时隐藏间隔下拉框，显示时间点列表编辑器
- [x] 4.3 时间点编辑器：使用 `<input type="time">` 添加时间点，列表展示已添加的时间点，每项带删除按钮
- [x] 4.4 时间点变更后调用 `apiClient.updateConfig()` 保存配置

## 5. 后端 API 适配

- [x] 5.1 修改 `web/server/routes/system.ts` 中 `GET /api/daemon/status`：返回 `scheduler.mode`（`'interval'` 或 `'timepoints'`）和 `scheduler.scheduleTimes`
- [x] 5.2 `nextAnalysis` 计算逻辑适配 timepoints 模式：找到当天或次日最近的时间点

## 6. Dashboard 展示适配

- [x] 6.1 修改 `web/client/src/pages/Dashboard.tsx`：调度器状态区域适配 timepoints 模式，展示配置的时间点列表
- [x] 6.2 高亮下一个即将执行的时间点

## 7. 构建验证

- [x] 7.1 运行 `npm run build` 确保无 TypeScript 编译错误
- [ ] 7.2 启动 daemon 测试 timepoints 模式调度是否正常工作
- [ ] 7.3 测试 WebUI 设置页面的时间点增删功能
- [ ] 7.4 测试 init 命令定时模式交互流程
