## MODIFIED Requirements

### Requirement: Schedule periodic analysis tasks

The system SHALL provide a scheduler that periodically triggers session analysis tasks based on configurable intervals. The scheduler SHALL support hot-reload: when configuration changes are saved, the scheduler SHALL automatically stop and restart with the new settings without requiring a full daemon restart.

#### Scenario: Daily analysis execution
- **WHEN** the configured time interval (e.g., 24 hours) has elapsed since the last analysis
- **THEN** the system triggers a new analysis task

#### Scenario: User-configured frequency
- **WHEN** user sets analysis frequency to "every 12 hours" in configuration
- **THEN** the system schedules tasks to run every 12 hours

#### Scenario: Manual trigger via CLI
- **WHEN** user executes `claude-evolution analyze --now`
- **THEN** the system creates a `runId` and `AnalysisLogger`, calls `runAnalysisPipeline({ runId, analysisLogger })`, and a new analysis run record appears in the database

#### Scenario: Manual trigger via Web UI
- **WHEN** user clicks "执行分析" in the Web UI dashboard
- **THEN** the system creates a `runId` and `AnalysisLogger`, calls `runAnalysisPipeline({ runId, analysisLogger })`, and a new analysis run record appears in the database

#### Scenario: Dashboard reflects manual analysis immediately
- **WHEN** a manual analysis completes successfully
- **THEN** the "最近分析记录" widget on the Dashboard SHALL display the new run on next page load or WebSocket refresh

#### Scenario: Config change triggers scheduler reload
- **WHEN** scheduler configuration is modified via Web UI or API
- **THEN** the scheduler SHALL automatically reload with the new settings without requiring daemon restart
