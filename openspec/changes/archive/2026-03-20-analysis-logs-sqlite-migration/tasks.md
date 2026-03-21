## 1. 依赖安装与项目配置

- [x] 1.1 安装 `better-sqlite3` 和 `@types/better-sqlite3` 依赖
- [x] 1.2 验证 TypeScript 编译配置兼容 better-sqlite3（ESM 互操作）

## 2. SQLite 数据库层实现

- [x] 2.1 创建 `src/analyzers/analysis-db.ts`，实现 `AnalysisDatabase` 类：初始化数据库、建表（`analysis_runs` + `analysis_steps`）、创建索引
- [x] 2.2 实现 `insertRun` / `updateRun` / `insertStep` / `updateStep` 方法（prepared statements）
- [x] 2.3 实现 `getAllRuns` 分页查询（支持 limit/offset，按 start_time DESC 排序）
- [x] 2.4 实现 `getRunById` 查询（JOIN steps 返回完整记录）
- [x] 2.5 实现 `cleanup` 方法：删除超出 500 条上限的旧记录及其关联 steps
- [x] 2.6 实现 `close` 方法用于优雅关闭数据库连接

## 3. 重写 AnalysisLogger

- [x] 3.1 重构 `src/analyzers/analysis-logger.ts`：内部替换为 `AnalysisDatabase` 实例，删除 JSON 读写和文件锁逻辑
- [x] 3.2 保持 `logAnalysisStart` / `logAnalysisEnd` / `logStep` / `getAllRuns` / `getRunById` 公开接口签名不变
- [x] 3.3 在 `logAnalysisEnd` 中调用 `cleanup()` 执行自动清理

## 4. JSON → SQLite 数据迁移

- [x] 4.1 在 `AnalysisLogger` 构造函数（或 `init` 方法）中检测旧 `analysis-runs.json` 是否存在
- [x] 4.2 若存在，将 JSON 中的 runs 和 steps 批量插入 SQLite（使用 transaction）
- [x] 4.3 迁移成功后将 JSON 文件重命名为 `analysis-runs.json.bak`
- [x] 4.4 迁移失败时记录错误日志，不阻塞正常启动

## 5. 修复手动触发路径

- [x] 5.1 修改 `web/server/routes/system.ts` 的 `POST /api/analyze` 处理：创建 `AnalysisLogger` 实例和 `runId`，改为调用 `runAnalysisPipeline({ runId, analysisLogger })` 替代 `analyzeCommand({ now: true })`
- [x] 5.2 在分析完成/失败时调用 `analysisLogger.logAnalysisEnd()` 记录结果

## 6. Daemon 适配

- [x] 6.1 确认 `src/daemon/daemon-process.ts` 无需改动（已正确传参），仅做回归验证
- [x] 6.2 在 daemon 关闭（SIGTERM/SIGINT）时调用 `analysisLogger` 的 `close()` 方法

## 7. 构建与验证

- [x] 7.1 运行 `npm run build` 确保 TypeScript 编译通过
- [x] 7.2 启动 daemon，验证 SQLite 数据库文件在 `~/.claude-evolution/logs/analysis.db` 正确创建
- [ ] 7.3 通过 Web UI 手动触发分析，验证 Dashboard "最近分析记录"正确展示新记录
- [x] 7.4 验证 `/api/analysis-logs` API 返回格式与前端兼容（无 breaking change）
- [x] 7.5 验证旧 JSON 数据迁移到 SQLite 后正确展示
