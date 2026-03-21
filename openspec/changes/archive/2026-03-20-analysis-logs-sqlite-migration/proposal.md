## Why

分析日志当前使用 JSON 文件存储（`~/.claude-evolution/logs/analysis-runs.json`），随着数据量增长会带来读写性能问题（每次读写需加载整个文件）。同时 Web UI 手动触发分析（`POST /api/analyze`）不会写入日志，导致 Dashboard 的"最近分析记录"模块无法展示手动执行的分析结果。需要迁移到 SQLite 并统一两条分析触发路径的日志记录。

## What Changes

- 将分析日志存储从 JSON 文件迁移到 SQLite 数据库（`~/.claude-evolution/logs/analysis.db`）
- 新增 `better-sqlite3` 依赖，替换当前的 JSON 读写 + 文件锁机制
- 重写 `AnalysisLogger` 类，内部改用 SQLite 操作，保持对外接口不变
- 修复 Web UI 手动触发路径（`POST /api/analyze`）不记录分析日志的 bug：让 `web/server/routes/system.ts` 也传入 `runId` 和 `analysisLogger`
- 添加自动清理策略：保留最近 500 条记录，超出自动删除
- 提供一次性迁移逻辑：启动时自动将旧 JSON 数据导入 SQLite

## Capabilities

### New Capabilities
- `sqlite-analysis-storage`: SQLite 数据库存储层，包含 `analysis_runs` 和 `analysis_steps` 两张表，支持分页查询、按状态筛选、自动清理

### Modified Capabilities
- `periodic-session-analyzer`: 手动触发路径需要传入 AnalysisLogger 参数，确保所有分析执行都记录日志

## Impact

- **代码文件**:
  - `src/analyzers/analysis-logger.ts` — 核心重写（JSON → SQLite）
  - `web/server/routes/system.ts` — 手动触发路径添加日志记录
  - `web/server/routes/analysis-logs.ts` — API 保持不变（AnalysisLogger 接口不变）
  - `src/daemon/daemon-process.ts` — 无需改动（已正确传参）
  - `src/analyzers/pipeline.ts` — 无需改动（已支持可选 logger）
- **依赖**: 新增 `better-sqlite3` + `@types/better-sqlite3`
- **数据迁移**: 旧 JSON 文件数据自动迁移到 SQLite，迁移后 JSON 文件重命名为 `.bak`
- **前端**: 无需改动（API 响应格式不变）
