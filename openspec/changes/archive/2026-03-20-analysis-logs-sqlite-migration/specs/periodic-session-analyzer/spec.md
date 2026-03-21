## MODIFIED Requirements

### Requirement: Manual trigger

The system SHALL record analysis logs for ALL trigger paths — both scheduled (daemon cron) and manual (Web UI `POST /api/analyze` or CLI `claude-evolution analyze --now`). The manual trigger path SHALL create an `AnalysisLogger` instance, generate a `runId`, and pass both to `runAnalysisPipeline()` so every analysis execution produces a complete log record.

#### Scenario: Manual trigger via Web UI records logs
- **WHEN** user clicks "执行分析" in the Web UI dashboard
- **THEN** the system creates a `runId` and `AnalysisLogger`, calls `runAnalysisPipeline({ runId, analysisLogger })`, and a new analysis run record appears in the database

#### Scenario: Manual trigger via CLI records logs
- **WHEN** user runs `claude-evolution analyze --now`
- **THEN** the system creates a `runId` and `AnalysisLogger`, calls `runAnalysisPipeline({ runId, analysisLogger })`, and a new analysis run record appears in the database

#### Scenario: Dashboard reflects manual analysis immediately
- **WHEN** a manual analysis completes successfully
- **THEN** the "最近分析记录" widget on the Dashboard SHALL display the new run on next page load or WebSocket refresh
