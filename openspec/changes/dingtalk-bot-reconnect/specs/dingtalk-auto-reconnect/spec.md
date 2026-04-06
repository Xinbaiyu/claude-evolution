## ADDED Requirements

### Requirement: Automatic reconnection on disconnection
The system SHALL automatically attempt to reconnect when a connection failure is detected (via SDK error event or heartbeat timeout). Reconnection SHALL use an exponential backoff strategy.

#### Scenario: First reconnection attempt
- **WHEN** the connection is lost for the first time
- **THEN** the system waits 1 second before attempting to reconnect

#### Scenario: Subsequent reconnection attempts
- **WHEN** the first reconnection attempt fails
- **THEN** the system waits 2 seconds before the second attempt, then 4s, 8s, 16s, 32s (exponential backoff)

#### Scenario: Maximum backoff delay
- **WHEN** the backoff delay exceeds 32 seconds
- **THEN** the delay is capped at 32 seconds for all subsequent attempts

### Requirement: Reconnection retry limit
The system SHALL limit the number of reconnection attempts to 10 (configurable). If all retries fail, the system SHALL stop attempting and log an ERROR-level message.

#### Scenario: Successful reconnection before limit
- **WHEN** the connection is lost and the 3rd reconnection attempt succeeds
- **THEN** the retry counter is reset to 0 and the state transitions to `connected`

#### Scenario: Max retries reached
- **WHEN** 10 reconnection attempts fail
- **THEN** the system stops retrying, sets state to `disconnected`, and logs an ERROR message

#### Scenario: Manual restart after max retries
- **WHEN** max retries are reached and `start()` is called again
- **THEN** the retry counter is reset and reconnection is attempted

### Requirement: Clean disconnection before reconnecting
The system SHALL call `disconnect()` on the existing `DWClient` instance before creating a new connection, to avoid resource leaks or connection conflicts.

#### Scenario: Reconnection with existing client
- **WHEN** reconnection is triggered and a `DWClient` instance exists
- **THEN** the system calls `disconnect()` on the old client before creating a new one

### Requirement: Reconnection configuration
The system SHALL support configuration of reconnection behavior via a `ReconnectConfig` object with the following fields: `enabled` (default: true), `maxRetries` (default: 10), `initialDelay` (default: 1000ms), `maxDelay` (default: 32000ms), `backoffMultiplier` (default: 2).

#### Scenario: Reconnection disabled via config
- **WHEN** the config has `reconnect.enabled: false`
- **THEN** automatic reconnection is not triggered and the bot remains in `disconnected` state

#### Scenario: Custom retry limit
- **WHEN** the config specifies `reconnect.maxRetries: 5`
- **THEN** the system stops retrying after 5 failed attempts

#### Scenario: Custom initial delay
- **WHEN** the config specifies `reconnect.initialDelay: 500`
- **THEN** the first reconnection attempt waits 500ms instead of 1 second

### Requirement: State protection during reconnection
The system SHALL prevent concurrent reconnection attempts by checking the current state. Reconnection SHALL only be initiated if the state is `disconnected`.

#### Scenario: Concurrent reconnection trigger
- **WHEN** a heartbeat timeout and an SDK error event both trigger reconnection simultaneously
- **THEN** only one reconnection process is initiated (state machine prevents duplicate attempts)

#### Scenario: Reconnection during active connection
- **WHEN** reconnection is triggered while the state is `connected`
- **THEN** the reconnection is ignored (no-op)
