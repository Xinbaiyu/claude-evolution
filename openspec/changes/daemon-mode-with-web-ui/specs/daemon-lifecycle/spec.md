## ADDED Requirements

### Requirement: Start daemon process
The system SHALL provide a `start` command that launches the daemon process with both scheduler and Web Server.

#### Scenario: Start in foreground mode
- **WHEN** user runs `claude-evolution start`
- **THEN** daemon starts in foreground
- **AND** console displays startup logs
- **AND** process responds to Ctrl+C for shutdown

#### Scenario: Start in background mode
- **WHEN** user runs `claude-evolution start --daemon`
- **THEN** daemon forks to background
- **AND** parent process exits immediately
- **AND** PID file is created at `~/.claude-evolution/daemon.pid`

#### Scenario: Start with custom port
- **WHEN** user runs `claude-evolution start --port 3000`
- **THEN** Web Server listens on port 3000
- **AND** PID file records the custom port

#### Scenario: Prevent duplicate start
- **WHEN** daemon is already running
- **AND** user runs `claude-evolution start`
- **THEN** system displays error "守护进程已在运行"
- **AND** suggests running `status` or `stop` commands
- **AND** exits with code 1

### Requirement: Stop daemon process
The system SHALL provide a `stop` command that gracefully stops the running daemon.

#### Scenario: Graceful shutdown
- **WHEN** user runs `claude-evolution stop`
- **AND** daemon is running
- **THEN** system sends SIGTERM signal to daemon PID
- **AND** waits up to 30 seconds for graceful shutdown
- **AND** deletes PID file
- **AND** displays "守护进程已停止"

#### Scenario: Stop when not running
- **WHEN** user runs `claude-evolution stop`
- **AND** no daemon is running
- **THEN** system displays "守护进程未运行"
- **AND** exits with code 0

#### Scenario: Force stop on timeout
- **WHEN** graceful shutdown exceeds 30 seconds
- **THEN** system sends SIGKILL signal
- **AND** force terminates the process

### Requirement: Restart daemon process
The system SHALL provide a `restart` command that stops and restarts the daemon.

#### Scenario: Restart running daemon
- **WHEN** user runs `claude-evolution restart`
- **AND** daemon is running
- **THEN** system stops the daemon
- **AND** waits for complete shutdown
- **AND** starts a new daemon process

#### Scenario: Restart when not running
- **WHEN** user runs `claude-evolution restart`
- **AND** no daemon is running
- **THEN** system starts a new daemon process
- **AND** displays "守护进程已启动"

### Requirement: Check daemon status
The system SHALL provide detailed status information about the running daemon.

#### Scenario: Status when running
- **WHEN** user runs `claude-evolution status`
- **AND** daemon is running
- **THEN** system displays daemon PID
- **AND** displays uptime
- **AND** displays Web UI URL
- **AND** displays scheduler status

#### Scenario: Status when not running
- **WHEN** user runs `claude-evolution status`
- **AND** no daemon is running
- **THEN** system displays "守护进程未运行"
- **AND** suggests running `start` command
