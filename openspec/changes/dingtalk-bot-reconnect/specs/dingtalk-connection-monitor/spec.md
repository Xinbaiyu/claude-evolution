## ADDED Requirements

### Requirement: Connection state tracking
The system SHALL maintain an explicit connection state with the following possible values: `disconnected`, `connecting`, `connected`, `reconnecting`. State transitions SHALL be logged for observability.

#### Scenario: Initial connection
- **WHEN** `DingTalkBotAdapter.start()` is called
- **THEN** the state transitions from `disconnected` to `connecting` and then to `connected` after WebSocket connection succeeds

#### Scenario: Connection failure during startup
- **WHEN** `DingTalkBotAdapter.start()` is called and the SDK connection fails
- **THEN** the state transitions to `disconnected` and a reconnection is scheduled

### Requirement: SDK error event monitoring
The system SHALL listen to the `error` event from `DWClient` and trigger reconnection when connection errors occur.

#### Scenario: Network error during active connection
- **WHEN** the SDK emits an `error` event with a network-related error
- **THEN** the connection state transitions to `disconnected` and automatic reconnection is triggered

#### Scenario: Server-side connection closure
- **WHEN** the DingTalk server closes the WebSocket connection
- **THEN** the SDK emits an `error` or `disconnect` event and the system detects the disconnection

### Requirement: Heartbeat-based liveness detection
The system SHALL implement a heartbeat mechanism to detect silent connection failures. The system SHALL track the last activity timestamp (updated when messages are received) and consider the connection unhealthy if no activity occurs within 60 seconds.

#### Scenario: Normal message activity
- **WHEN** the bot receives a message from DingTalk
- **THEN** the last activity timestamp is updated to the current time

#### Scenario: Heartbeat timeout detection
- **WHEN** no messages are received for 60 seconds
- **THEN** the system considers the connection unhealthy and triggers reconnection

#### Scenario: Heartbeat check interval
- **WHEN** the bot is in `connected` state
- **THEN** the system checks the last activity timestamp every 30 seconds

### Requirement: Connection status API
The system SHALL expose a `getStatus()` method that returns the current connection status, including state, last connected time, last disconnect time, and reconnection attempts.

#### Scenario: Querying connection status
- **WHEN** `getStatus()` is called
- **THEN** it returns an object with fields: `state`, `lastConnectedAt`, `lastDisconnectAt`, `reconnectAttempts`, `maxReconnectAttempts`

#### Scenario: Status after successful connection
- **WHEN** the bot successfully connects to DingTalk
- **THEN** `getStatus()` returns `state: 'connected'` and `lastConnectedAt` is set to the current timestamp

#### Scenario: Status during reconnection
- **WHEN** the bot is attempting to reconnect
- **THEN** `getStatus()` returns `state: 'reconnecting'` and `reconnectAttempts` shows the current retry count
