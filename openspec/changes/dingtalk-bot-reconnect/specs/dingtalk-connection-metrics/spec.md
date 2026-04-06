## ADDED Requirements

### Requirement: Connection event logging
The system SHALL log all connection state transitions (disconnected → connecting, connecting → connected, connected → disconnected, disconnected → reconnecting) to the file logger for observability.

#### Scenario: Successful connection log
- **WHEN** the bot successfully connects to DingTalk
- **THEN** a log entry is written: `[DingTalk Bot] 连接状态: connecting → connected`

#### Scenario: Disconnection log
- **WHEN** the connection is lost
- **THEN** a log entry is written: `[DingTalk Bot] 连接状态: connected → disconnected, 原因: <error message>`

#### Scenario: Reconnection attempt log
- **WHEN** a reconnection is scheduled
- **THEN** a log entry is written: `[DingTalk Bot] 重连尝试 #<N>/<maxRetries>, 延迟: <delay>ms`

### Requirement: Connection metrics exposure
The system SHALL expose connection metrics via the `getStatus()` method, including: current state, total reconnection attempts, last connected timestamp, last disconnected timestamp.

#### Scenario: Metrics after successful connection
- **WHEN** the bot has been connected for 5 minutes
- **THEN** `getStatus()` returns `{ state: 'connected', lastConnectedAt: <timestamp>, reconnectAttempts: 0 }`

#### Scenario: Metrics during reconnection
- **WHEN** the bot is on its 3rd reconnection attempt
- **THEN** `getStatus()` returns `{ state: 'reconnecting', reconnectAttempts: 3, lastDisconnectAt: <timestamp> }`

#### Scenario: Metrics after max retries
- **WHEN** the bot reaches max retry limit and stops
- **THEN** `getStatus()` returns `{ state: 'disconnected', reconnectAttempts: 10, lastDisconnectAt: <timestamp> }`

### Requirement: Connection uptime tracking
The system SHALL track the total uptime (time spent in `connected` state) and make it available via `getStatus()`. Uptime SHALL be reset when the connection is lost.

#### Scenario: Uptime during stable connection
- **WHEN** the bot has been connected continuously for 10 minutes
- **THEN** `getStatus()` includes `uptimeSeconds: 600`

#### Scenario: Uptime reset after disconnection
- **WHEN** the connection is lost and then re-established
- **THEN** the uptime counter is reset to 0

### Requirement: Reconnection failure reason logging
The system SHALL log the reason for each reconnection failure, including error messages from the SDK, to aid in debugging.

#### Scenario: Connection failure with SDK error
- **WHEN** a reconnection attempt fails with error "ECONNREFUSED"
- **THEN** the log includes: `[DingTalk Bot] 重连失败: ECONNREFUSED`

#### Scenario: Connection timeout
- **WHEN** a reconnection attempt times out
- **THEN** the log includes: `[DingTalk Bot] 重连超时`
