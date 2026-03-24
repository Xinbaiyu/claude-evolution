## ADDED Requirements

### Requirement: POST /api/reminders — Create reminder
The system SHALL provide a POST endpoint to create a new reminder. The request body MUST include `message` and either `triggerAt` (ISO 8601 for one-shot) or `schedule` (cron expression for recurring).

#### Scenario: Create one-shot reminder
- **WHEN** POST `/api/reminders` with `{ "message": "检查部署", "triggerAt": "2026-03-25T15:00:00+08:00" }`
- **THEN** the system returns `201` with `{ "success": true, "data": { "id": "...", "message": "检查部署", "triggerAt": "...", "type": "one-shot", "createdAt": "..." } }`

#### Scenario: Create recurring reminder
- **WHEN** POST `/api/reminders` with `{ "message": "检查邮件", "schedule": "0 9 * * *" }`
- **THEN** the system returns `201` with `{ "success": true, "data": { "id": "...", "message": "检查邮件", "schedule": "0 9 * * *", "type": "recurring", "createdAt": "..." } }`

#### Scenario: Invalid request body
- **WHEN** POST `/api/reminders` with missing `message` field
- **THEN** the system returns `400` with `{ "success": false, "error": "message is required" }`

### Requirement: GET /api/reminders — List reminders
The system SHALL provide a GET endpoint to list all active reminders.

#### Scenario: List all reminders
- **WHEN** GET `/api/reminders`
- **THEN** the system returns `200` with `{ "success": true, "data": [...], "meta": { "total": N } }`

### Requirement: DELETE /api/reminders/:id — Delete reminder
The system SHALL provide a DELETE endpoint to remove a specific reminder by ID.

#### Scenario: Delete existing reminder
- **WHEN** DELETE `/api/reminders/abc123`
- **THEN** the system cancels the reminder, removes it from storage, and returns `200` with `{ "success": true }`

#### Scenario: Delete non-existent reminder
- **WHEN** DELETE `/api/reminders/nonexistent`
- **THEN** the system returns `404` with `{ "success": false, "error": "Reminder not found" }`

### Requirement: GET /api/reminders/:id — Get reminder detail
The system SHALL provide a GET endpoint to retrieve a specific reminder by ID.

#### Scenario: Get existing reminder
- **WHEN** GET `/api/reminders/abc123`
- **THEN** the system returns `200` with the full reminder object

#### Scenario: Get non-existent reminder
- **WHEN** GET `/api/reminders/nonexistent`
- **THEN** the system returns `404` with `{ "success": false, "error": "Reminder not found" }`

### Requirement: API input validation
The system SHALL validate all API inputs using Zod schemas. Invalid inputs SHALL return `400` with a descriptive error message.

#### Scenario: Invalid cron expression
- **WHEN** POST `/api/reminders` with `{ "message": "test", "schedule": "invalid cron" }`
- **THEN** the system returns `400` with `{ "success": false, "error": "Invalid cron expression" }`

#### Scenario: triggerAt is not valid ISO 8601
- **WHEN** POST `/api/reminders` with `{ "message": "test", "triggerAt": "tomorrow" }`
- **THEN** the system returns `400` with `{ "success": false, "error": "triggerAt must be a valid ISO 8601 datetime" }`
