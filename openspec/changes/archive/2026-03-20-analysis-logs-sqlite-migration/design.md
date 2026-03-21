## Context

当前分析日志系统使用 JSON 文件（`~/.claude-evolution/logs/analysis-runs.json`）存储所有分析运行记录。每次读写都需要加载整个文件并用文件锁防止并发冲突。系统有两条分析触发路径：

1. **Daemon 定时调度** — 通过 `CronScheduler` 触发，传入 `{ runId, analysisLogger }` → 日志正常写入
2. **Web UI 手动触发** — 通过 `POST /api/analyze` → 调用 `analyzeCommand({ now: true })` → `runAnalysisPipeline()` 不传参数 → 日志不写入

前端 `RecentAnalysisWidget` 从 `/api/analysis-logs` 读取数据，但手动触发的分析从未记录。

## Goals / Non-Goals

**Goals:**
- 将日志存储迁移到 SQLite，支持高效分页查询和条件筛选
- 统一两条分析路径的日志记录，确保所有分析执行都有日志
- 自动清理旧记录（保留最近 500 条）
- 旧 JSON 数据一次性迁移到 SQLite
- 保持 `AnalysisLogger` 公开接口不变，减少调用方改动

**Non-Goals:**
- 不做前端改动（API 响应格式不变）
- 不引入 ORM（项目规模不需要，直接用 better-sqlite3 同步 API 更简单）
- 不做 pipeline.ts 改动（已支持可选 logger 参数）
- 不做 daemon-process.ts 改动（已正确传参）

## Decisions

### 1. 使用 better-sqlite3 而非其他 SQLite 库

**选择**: `better-sqlite3`

**替代方案**:
- `sql.js` — 纯 JS 实现，性能较差
- `sqlite3`（node-sqlite3）— 异步 API，需要回调/Promise 包装，更复杂
- `drizzle-orm` / `prisma` — ORM 过重，项目只有一个简单的日志表

**理由**: `better-sqlite3` 提供同步 API，性能最佳，API 简洁。对于本地工具的日志写入场景，同步操作反而更可靠（无需处理异步竞争），且不再需要文件锁机制。

### 2. 数据库表结构设计 — 两张表

**选择**: `analysis_runs` + `analysis_steps` 两张表，用 `run_id` 外键关联

**替代方案**:
- 单表 + JSON 字段存 steps — 查询单步骤不方便
- 单表展平 — 数据冗余严重

**理由**: 分离 runs 和 steps 符合关系型数据的范式，支持按步骤维度查询（如"所有失败的步骤"），且 SQLite 的 JOIN 性能对此数据量绰绰有余。

```sql
CREATE TABLE analysis_runs (
  id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  error_stack TEXT,
  stats_merged INTEGER,
  stats_promoted INTEGER,
  stats_archived INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE analysis_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  duration INTEGER,
  output TEXT,
  error TEXT,
  FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_runs_start_time ON analysis_runs(start_time DESC);
CREATE INDEX idx_runs_status ON analysis_runs(status);
CREATE INDEX idx_steps_run_id ON analysis_steps(run_id);
```

### 3. AnalysisLogger 接口保持不变

**选择**: 保持现有公开方法签名（`logAnalysisStart`, `logAnalysisEnd`, `logStep`, `getAllRuns`, `getRunById`），内部实现从 JSON 改为 SQLite

**理由**: `daemon-process.ts`、`pipeline.ts`、`analysis-logs.ts` 路由都直接调用这些方法。保持接口不变意味着这些文件只需最小改动或无需改动。

### 4. 手动触发路径修复方式

**选择**: 在 `web/server/routes/system.ts` 的 `POST /api/analyze` 处理器中，直接创建 `AnalysisLogger` 实例和 `runId`，调用 `runAnalysisPipeline({ runId, analysisLogger })` 而非 `analyzeCommand({ now: true })`

**替代方案**:
- 修改 `analyzeCommand` 让它内部创建 logger — 但 CLI 命令和 Web API 的关注点不同，CLI 用 stdout 输出
- 在 pipeline.ts 内部自动创建 logger — 会改变函数的职责边界

**理由**: Web API 路由直接调用 pipeline 更直接，避免通过 CLI 命令层的间接调用。保持 `analyzeCommand` 仅服务于 CLI 场景。

### 5. 数据清理策略

**选择**: 在 `logAnalysisEnd` 完成后触发清理，删除超出 500 条的旧记录（按 `start_time DESC` 排序）

**理由**: 每次分析结束是最自然的清理时机。500 条记录在 SQLite 中占用极小空间（预估 < 1MB），查询性能无压力。

## Risks / Trade-offs

- **[Native 依赖]** `better-sqlite3` 是 C++ 原生模块，需要编译环境 → 项目已使用 Node.js 生态，macOS/Linux 环境下 npm install 会自动编译，风险可控
- **[同步 API]** better-sqlite3 是同步的，大量数据写入可能阻塞事件循环 → 分析日志写入量很小（每次分析 ~10 条 step），不会造成阻塞
- **[迁移失败]** JSON 文件格式损坏导致迁移失败 → 迁移逻辑 catch 错误后跳过，不影响新功能使用；JSON 文件重命名为 `.bak` 而非删除
- **[数据库文件损坏]** SQLite 文件损坏 → better-sqlite3 支持 WAL 模式，数据安全性好；极端情况下可删除 `.db` 文件重新开始
