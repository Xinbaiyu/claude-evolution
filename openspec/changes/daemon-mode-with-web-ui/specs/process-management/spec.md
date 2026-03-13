## ADDED Requirements

### Requirement: PID file management
The system SHALL create and maintain a PID file at `~/.claude-evolution/daemon.pid` containing process metadata.

#### Scenario: Create PID file on start
- **WHEN** daemon starts successfully
- **THEN** system creates PID file with JSON content
- **AND** includes pid, startTime, port, and version fields

#### Scenario: Detect stale PID file
- **WHEN** PID file exists but process is not running
- **THEN** system removes stale PID file
- **AND** allows new daemon to start

### Requirement: Signal handling
The system SHALL handle SIGTERM and SIGINT signals for graceful shutdown.

#### Scenario: Handle SIGTERM
- **WHEN** daemon receives SIGTERM signal
- **THEN** daemon initiates graceful shutdown sequence
- **AND** stops accepting new requests
- **AND** waits for current tasks to complete
- **AND** exits with code 0

#### Scenario: Handle SIGINT (Ctrl+C)
- **WHEN** daemon receives SIGINT in foreground mode
- **THEN** daemon performs same graceful shutdown as SIGTERM

### Requirement: Graceful shutdown
The system SHALL ensure no data loss during shutdown.

#### Scenario: Wait for current analysis
- **WHEN** shutdown is initiated during analysis
- **THEN** system waits up to 30 seconds for analysis to complete
- **AND** saves partial results if timeout occurs
- **AND** closes all file handles cleanly
