## ADDED Requirements

### Requirement: File logging
The system SHALL write daemon logs to `~/.claude-evolution/logs/daemon.log`.

#### Scenario: Log with timestamp and level
- **WHEN** daemon logs a message
- **THEN** log entry includes ISO 8601 timestamp
- **AND** includes log level (INFO/WARN/ERROR)
- **AND** includes message content

#### Scenario: Log rotation on size
- **WHEN** log file exceeds 10MB
- **THEN** system rotates log file
- **AND** renames current file to daemon.log.1
- **AND** creates new daemon.log
- **AND** keeps maximum 7 rotated files

### Requirement: View logs command
The system SHALL provide a `logs` command to view daemon logs.

#### Scenario: View recent logs
- **WHEN** user runs `claude-evolution logs`
- **THEN** system displays last 50 lines of daemon.log

#### Scenario: Follow logs in real-time
- **WHEN** user runs `claude-evolution logs --follow`
- **THEN** system tails log file
- **AND** displays new entries as they are written

#### Scenario: Filter by log level
- **WHEN** user runs `claude-evolution logs --level error`
- **THEN** system displays only ERROR level logs
