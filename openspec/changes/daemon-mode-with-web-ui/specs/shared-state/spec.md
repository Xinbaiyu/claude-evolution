## ADDED Requirements

### Requirement: Shared state object
The system SHALL maintain a shared state object accessible to both scheduler and Web Server.

#### Scenario: Update scheduler state
- **WHEN** scheduler completes an analysis
- **THEN** scheduler updates daemonState.scheduler.lastExecution
- **AND** increments daemonState.scheduler.totalExecutions
- **AND** emits 'scheduler:executed' event

#### Scenario: Web Server reads state
- **WHEN** Web UI requests `/api/daemon/status`
- **THEN** Web Server returns current daemonState
- **AND** includes scheduler status
- **AND** includes Web Server status
- **AND** includes suggestions statistics

### Requirement: Event-driven state updates
The system SHALL use EventEmitter for decoupled state communication.

#### Scenario: Broadcast state via WebSocket
- **WHEN** scheduler emits 'scheduler:executed' event
- **THEN** Web Server listens for event
- **AND** broadcasts update to all WebSocket clients
- **AND** clients update UI in real-time

### Requirement: State persistence
The system SHALL NOT persist daemon state to disk (in-memory only).

#### Scenario: State reset on restart
- **WHEN** daemon restarts
- **THEN** state initializes with default values
- **AND** scheduler loads last execution time from state.json
- **AND** suggestions load from pending.json
