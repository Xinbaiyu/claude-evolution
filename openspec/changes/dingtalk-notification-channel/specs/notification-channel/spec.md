## MODIFIED Requirements

### Requirement: Channel configuration
The system SHALL allow enabling/disabling individual notification channels via configuration. Each channel SHALL have an `enabled` boolean in the config. The webhook channel SHALL support an additional `webhooks` array containing individual webhook endpoint configurations.

#### Scenario: Desktop notifications disabled
- **WHEN** the config has `reminders.channels.desktop.enabled: false`
- **THEN** the DesktopChannel is not used for reminder notifications, but WebSocketChannel and WebhookChannel still operate normally

#### Scenario: Webhook channel enabled with endpoints
- **WHEN** the config has `reminders.channels.webhook.enabled: true` and `webhooks` array with valid entries
- **THEN** the NotificationDispatcher includes the WebhookChannel, which sends to all enabled webhook endpoints

#### Scenario: Webhook channel enabled but no endpoints
- **WHEN** the config has `reminders.channels.webhook.enabled: true` but `webhooks` is empty or missing
- **THEN** the WebhookChannel is registered but sends no notifications (no error)
