## ADDED Requirements

### Requirement: NotificationChannel interface
The system SHALL define a `NotificationChannel` interface with a `send(notification)` method. All notification implementations MUST conform to this interface.

#### Scenario: Channel receives a notification
- **WHEN** `send()` is called with `{ title: "提醒", body: "检查部署", type: "reminder" }`
- **THEN** the channel delivers the notification through its specific transport mechanism

### Requirement: DesktopChannel implementation
The system SHALL provide a `DesktopChannel` that sends OS-level desktop notifications by wrapping the existing `notifier.ts` utility.

#### Scenario: Desktop notification on macOS
- **WHEN** a reminder fires on macOS
- **THEN** the system calls `osascript` to display a notification with the reminder title and message

#### Scenario: Desktop notification on Linux
- **WHEN** a reminder fires on Linux
- **THEN** the system calls `notify-send` with the reminder title and message

### Requirement: WebSocketChannel implementation
The system SHALL provide a `WebSocketChannel` that broadcasts reminder notifications to all connected Web UI clients via the existing `WebSocketManager`.

#### Scenario: WebSocket notification broadcast
- **WHEN** a reminder fires and 2 clients are connected via WebSocket
- **THEN** both clients receive a `reminder_triggered` event with the reminder data

#### Scenario: No connected clients
- **WHEN** a reminder fires and no WebSocket clients are connected
- **THEN** the notification is silently discarded (no error)

### Requirement: Multi-channel dispatch
The system SHALL dispatch notifications to all enabled channels simultaneously. A failure in one channel SHALL NOT prevent other channels from receiving the notification.

#### Scenario: Desktop fails but WebSocket succeeds
- **WHEN** a reminder fires and the desktop notification command fails
- **THEN** the WebSocket notification is still sent successfully, and the desktop failure is logged as a warning

### Requirement: Channel configuration
The system SHALL allow enabling/disabling individual notification channels via configuration. Each channel SHALL have an `enabled` boolean in the config.

#### Scenario: Desktop notifications disabled
- **WHEN** the config has `reminders.channels.desktop.enabled: false`
- **THEN** the DesktopChannel is not used for reminder notifications, but WebSocketChannel still operates normally
