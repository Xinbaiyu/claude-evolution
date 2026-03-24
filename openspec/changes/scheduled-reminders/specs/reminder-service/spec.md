## ADDED Requirements

### Requirement: Create one-shot reminder
The system SHALL allow creating a one-shot reminder with a target time and message. The reminder SHALL be assigned a unique ID and persisted to disk immediately.

#### Scenario: Create a reminder for a future time
- **WHEN** a reminder is created with time "2026-03-25T15:00:00+08:00" and message "检查部署状态"
- **THEN** the system creates a reminder with a unique ID, persists it to `~/.claude-evolution/reminders.json`, and registers a node-cron task with expression `0 15 25 3 *` that auto-removes after firing

#### Scenario: Create a reminder for a past time
- **WHEN** a reminder is created with a time that has already passed
- **THEN** the system SHALL reject the creation with an error "Reminder time is in the past"

### Requirement: Create recurring reminder
The system SHALL allow creating recurring reminders with an interval (e.g., "every 1h", "every day at 09:00"). Recurring reminders SHALL use node-cron for scheduling.

#### Scenario: Create a daily recurring reminder
- **WHEN** a reminder is created with schedule "0 9 * * *" and message "检查邮件"
- **THEN** the system creates a recurring reminder, persists it, and registers a cron job that fires daily at 09:00

#### Scenario: Recurring reminder fires
- **WHEN** a recurring reminder's scheduled time arrives
- **THEN** the system triggers all configured notification channels and the reminder remains active for the next occurrence

### Requirement: Delete reminder
The system SHALL allow deleting a reminder by its ID. Deletion SHALL cancel the scheduled cron task and remove the reminder from persistent storage.

#### Scenario: Delete an existing reminder
- **WHEN** a reminder with ID "abc123" is deleted
- **THEN** the system cancels its timer, removes it from `reminders.json`, and returns success

#### Scenario: Delete a non-existent reminder
- **WHEN** a delete is requested for a non-existent ID
- **THEN** the system returns a 404 error

### Requirement: Persist and recover reminders across restarts
The system SHALL persist all active reminders to `~/.claude-evolution/reminders.json`. On daemon startup, the system SHALL load and re-schedule all persisted reminders via node-cron.

#### Scenario: Daemon restarts with pending reminders
- **WHEN** the daemon restarts and `reminders.json` contains 3 pending reminders (2 future, 1 past)
- **THEN** the system re-registers node-cron tasks for the 2 future reminders and immediately triggers the 1 overdue reminder

#### Scenario: Daemon restarts with no reminders file
- **WHEN** the daemon starts and `reminders.json` does not exist
- **THEN** the system creates an empty reminders file and proceeds normally

### Requirement: List active reminders
The system SHALL provide a way to list all active reminders with their ID, message, scheduled time, and type (one-shot/recurring).

#### Scenario: List reminders when reminders exist
- **WHEN** the system has 3 active reminders
- **THEN** it returns an array of 3 reminder objects with id, message, triggerAt, type, and createdAt fields

#### Scenario: List reminders when empty
- **WHEN** there are no active reminders
- **THEN** it returns an empty array
