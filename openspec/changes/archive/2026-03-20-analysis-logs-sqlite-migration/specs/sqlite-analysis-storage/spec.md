## ADDED Requirements

### Requirement: SQLite database initialization
系统 SHALL 在首次使用时自动创建 SQLite 数据库文件（`~/.claude-evolution/logs/analysis.db`），包含 `analysis_runs` 和 `analysis_steps` 两张表及必要索引。数据库 SHALL 使用 WAL 模式以提高并发读写性能。

#### Scenario: First-time database creation
- **WHEN** AnalysisLogger 首次被实例化且数据库文件不存在
- **THEN** 系统自动创建数据库文件并初始化表结构（`analysis_runs`, `analysis_steps`）和索引

#### Scenario: Database already exists
- **WHEN** AnalysisLogger 被实例化且数据库文件已存在
- **THEN** 系统直接打开已有数据库，不重复建表

---

### Requirement: Analysis run lifecycle logging
系统 SHALL 记录每次分析运行的完整生命周期，包括开始、步骤执行和结束。

#### Scenario: Log analysis start
- **WHEN** 调用 `logAnalysisStart(runId)` 时
- **THEN** 系统在 `analysis_runs` 表中插入一条记录，status 为 `running`，start_time 为当前时间

#### Scenario: Log analysis step
- **WHEN** 调用 `logStep(runId, stepInfo)` 时
- **THEN** 系统在 `analysis_steps` 表中插入或更新对应步骤记录（按 run_id + step 唯一标识）

#### Scenario: Log analysis end with success
- **WHEN** 调用 `logAnalysisEnd(runId, { status: 'success', stats })` 时
- **THEN** 系统更新 `analysis_runs` 表中对应记录的 end_time、duration、status 和 stats 字段

#### Scenario: Log analysis end with failure
- **WHEN** 调用 `logAnalysisEnd(runId, { status: 'failed', error })` 时
- **THEN** 系统更新 `analysis_runs` 表中对应记录的 end_time、duration、status、error_message 和 error_stack 字段

---

### Requirement: Query analysis runs with pagination
系统 SHALL 支持分页查询分析运行记录，按 start_time 降序排列。返回的数据格式 SHALL 与现有 `AnalysisRun` 接口一致（包含嵌套的 steps 数组）。

#### Scenario: Get all runs with default pagination
- **WHEN** 调用 `getAllRuns()` 不传参数
- **THEN** 返回最近 50 条分析运行记录，每条记录包含关联的 steps 数组

#### Scenario: Get all runs with custom pagination
- **WHEN** 调用 `getAllRuns({ limit: 10, offset: 20 })` 时
- **THEN** 返回从第 21 条开始的 10 条记录

#### Scenario: Get run by ID
- **WHEN** 调用 `getRunById(runId)` 时
- **THEN** 返回对应的完整运行记录（含 steps），若不存在返回 null

---

### Requirement: Automatic log retention cleanup
系统 SHALL 自动清理超出保留上限（500 条）的旧分析记录。

#### Scenario: Cleanup triggered after analysis ends
- **WHEN** `logAnalysisEnd` 完成后，总记录数超过 500 条
- **THEN** 系统自动删除最旧的记录，使总数降至 500 条。关联的 steps 记录 SHALL 通过级联删除自动清理。

#### Scenario: Records within limit
- **WHEN** `logAnalysisEnd` 完成后，总记录数不超过 500 条
- **THEN** 不执行任何清理操作

---

### Requirement: JSON to SQLite data migration
系统 SHALL 在首次使用时自动将旧 JSON 文件（`analysis-runs.json`）中的数据迁移到 SQLite 数据库。

#### Scenario: Successful migration from JSON
- **WHEN** 数据库首次初始化且 `analysis-runs.json` 文件存在
- **THEN** 系统将 JSON 中的所有 runs 和 steps 导入 SQLite，完成后将 JSON 文件重命名为 `analysis-runs.json.bak`

#### Scenario: JSON file not found
- **WHEN** 数据库首次初始化且 `analysis-runs.json` 不存在
- **THEN** 系统正常初始化空数据库，不报错

#### Scenario: JSON file corrupted
- **WHEN** 数据库首次初始化且 `analysis-runs.json` 内容无法解析
- **THEN** 系统跳过迁移并记录警告日志，正常初始化空数据库

---

### Requirement: Web UI manual trigger records logs
Web UI 手动触发的分析（`POST /api/analyze`）SHALL 与 daemon 定时调度一样记录完整的分析日志。

#### Scenario: Manual analysis trigger via Web UI
- **WHEN** 用户通过 Dashboard 点击"执行分析"按钮触发 `POST /api/analyze`
- **THEN** 系统创建 runId 和 AnalysisLogger 实例，调用 `runAnalysisPipeline({ runId, analysisLogger })`，分析过程中的所有步骤和结果都记录到数据库

#### Scenario: Dashboard refresh shows manual run
- **WHEN** 手动分析完成后用户刷新 Dashboard
- **THEN** "最近分析记录"模块展示刚完成的分析运行记录
