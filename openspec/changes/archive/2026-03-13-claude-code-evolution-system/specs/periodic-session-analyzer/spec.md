## ADDED Requirements

### Requirement: Schedule periodic analysis tasks

The system SHALL provide a scheduler that periodically triggers session analysis tasks based on configurable intervals.

#### Scenario: Daily analysis execution
- **WHEN** the configured time interval (e.g., 24 hours) has elapsed since the last analysis
- **THEN** the system triggers a new analysis task

#### Scenario: User-configured frequency
- **WHEN** user sets analysis frequency to "every 12 hours" in configuration
- **THEN** the system schedules tasks to run every 12 hours

#### Scenario: Manual trigger
- **WHEN** user executes `claude-evolution analyze --now`
- **THEN** the system immediately triggers an analysis task regardless of schedule

### Requirement: Collect session data from claude-mem

The system SHALL retrieve recent session data from the claude-mem MCP service for analysis.

#### Scenario: Incremental data collection
- **WHEN** analysis task starts
- **THEN** the system queries claude-mem for sessions since the last analysis timestamp

#### Scenario: Handle missing data
- **WHEN** claude-mem returns no sessions for the specified time range
- **THEN** the system logs "No new sessions to analyze" and exits gracefully

#### Scenario: Respect data retention limits
- **WHEN** analyzing sessions
- **THEN** the system only processes sessions from the last 30 days

### Requirement: Filter sensitive information

The system SHALL automatically filter out sensitive information before processing session data.

#### Scenario: API key detection
- **WHEN** session content contains patterns matching API keys (e.g., "sk-...", "ghp_...")
- **THEN** the system replaces them with "[REDACTED]" before analysis

#### Scenario: Password detection
- **WHEN** session content contains password-like patterns
- **THEN** the system removes or masks those patterns

#### Scenario: User-defined blacklist
- **WHEN** user has configured custom sensitive keywords in config
- **THEN** the system filters those keywords from session data

### Requirement: Handle scheduler errors gracefully

The system SHALL handle scheduling errors without disrupting the main Claude Code workflow.

#### Scenario: Analysis failure
- **WHEN** an analysis task fails with an error
- **THEN** the system logs the error and schedules the next attempt without blocking

#### Scenario: MCP service unavailable
- **WHEN** claude-mem MCP service is not reachable
- **THEN** the system logs a warning and retries after a configurable delay

#### Scenario: Rate limit handling
- **WHEN** LLM API rate limit is hit during analysis
- **THEN** the system backs off exponentially and reschedules the task
