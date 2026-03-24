## ADDED Requirements

### Requirement: WebhookChannel implements NotificationChannel
The system SHALL provide a `WebhookChannel` class that implements the `NotificationChannel` interface. It SHALL send notifications via HTTP POST to one or more configured webhook endpoints.

#### Scenario: Single webhook notification
- **WHEN** a reminder fires and one webhook is configured with preset `dingtalk`
- **THEN** the system sends an HTTP POST to the configured URL with the DingTalk JSON body containing the reminder title and body

#### Scenario: Multiple webhooks
- **WHEN** a reminder fires and two webhooks are configured (dingtalk + feishu)
- **THEN** the system sends HTTP POST to both endpoints in parallel using `Promise.allSettled`

#### Scenario: Webhook send failure
- **WHEN** a webhook endpoint returns HTTP 500 or is unreachable
- **THEN** the failure is logged as a warning with the webhook name, and other webhooks continue sending

### Requirement: Preset templates for common IM platforms
The system SHALL include built-in preset templates for DingTalk, Feishu, WeCom, and Slack Incoming Webhook. Each preset SHALL define a JSON request body template with placeholder variables.

#### Scenario: DingTalk preset
- **WHEN** a webhook is configured with `preset: "dingtalk"`
- **THEN** the request body SHALL be `{"msgtype":"text","text":{"content":"{{title}}: {{body}}"}}`

#### Scenario: Feishu preset
- **WHEN** a webhook is configured with `preset: "feishu"`
- **THEN** the request body SHALL be `{"msg_type":"text","content":{"text":"{{title}}: {{body}}"}}`

#### Scenario: Custom template
- **WHEN** a webhook is configured with a `template` field instead of `preset`
- **THEN** the system SHALL use the provided template string with `{{title}}`, `{{body}}`, `{{type}}`, `{{timestamp}}` placeholders

### Requirement: Template variable substitution
The system SHALL replace `{{variable}}` placeholders in templates with actual notification values. Values inserted into JSON templates SHALL be JSON-escaped to prevent malformed output.

#### Scenario: Message with special characters
- **WHEN** a notification body contains `He said "hello" & left`
- **THEN** the JSON template output SHALL properly escape the quotes: `He said \"hello\" & left`

#### Scenario: Available variables
- **WHEN** a template contains `{{title}}`, `{{body}}`, `{{type}}`, `{{timestamp}}`
- **THEN** all four variables SHALL be replaced with the notification's title, body, type, and ISO 8601 trigger timestamp respectively

### Requirement: DingTalk HMAC-SHA256 signing
The system SHALL support DingTalk's custom robot signing mode. When a `secret` is configured for a DingTalk webhook, the system SHALL compute an HMAC-SHA256 signature and append `timestamp` and `sign` query parameters to the webhook URL.

#### Scenario: Signed DingTalk request
- **WHEN** a webhook has `preset: "dingtalk"` and `secret: "SEC..."` configured
- **THEN** the system computes `sign = URLEncode(Base64(HmacSHA256(timestamp + "\n" + secret, secret)))` and appends `&timestamp=<ms>&sign=<sign>` to the URL

#### Scenario: Unsigned DingTalk request
- **WHEN** a webhook has `preset: "dingtalk"` and no `secret` configured
- **THEN** the system sends the request without adding timestamp or sign parameters

### Requirement: Webhook configuration schema
The system SHALL validate webhook configuration using Zod. Each webhook entry SHALL require `name` and `url`, and accept optional `preset`, `template`, `secret`, `headers`, and `enabled` fields.

#### Scenario: Valid configuration
- **WHEN** config contains `{ name: "钉钉", url: "https://oapi.dingtalk.com/robot/send?access_token=xxx", preset: "dingtalk" }`
- **THEN** the configuration passes validation

#### Scenario: Missing URL
- **WHEN** config contains a webhook entry without `url`
- **THEN** validation fails with an error indicating `url` is required

#### Scenario: Disabled webhook
- **WHEN** a webhook entry has `enabled: false`
- **THEN** the system skips this webhook during notification dispatch

### Requirement: Security — webhook URLs not exposed via API
The system SHALL NOT expose webhook URLs or secrets through any REST API endpoint. These values SHALL only be read from the local configuration file.

#### Scenario: API does not leak webhook config
- **WHEN** a client requests reminder or notification configuration via the API
- **THEN** webhook URLs and secrets are NOT included in the response
