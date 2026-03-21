# scheduler-hot-reload Specification

## Purpose
TBD - created by archiving change scheduler-hot-reload. Update Purpose after archive.
## Requirements
### Requirement: Scheduler reloads automatically when config changes

The system SHALL automatically stop and restart the scheduler with updated configuration when scheduler-related settings are modified via the Web UI or API.

#### Scenario: User changes interval mode from timepoints to 6h
- **WHEN** user changes scheduler.interval from "timepoints" to "6h" via Settings page and saves
- **THEN** the running scheduler SHALL stop all existing cron tasks and start a new cron task with the "0 */6 * * *" schedule within 2 seconds of the config save

#### Scenario: User adds a new timepoint
- **WHEN** user adds "18:00" to scheduleTimes while in timepoints mode and saves
- **THEN** the scheduler SHALL stop all existing cron tasks and create new cron tasks for each timepoint including the newly added one

#### Scenario: User disables scheduler
- **WHEN** user sets scheduler.enabled to false and saves
- **THEN** the scheduler SHALL stop all cron tasks and remain stopped until re-enabled

#### Scenario: User re-enables scheduler
- **WHEN** user sets scheduler.enabled to true after it was disabled and saves
- **THEN** the scheduler SHALL start with the current config settings

#### Scenario: Non-scheduler config changes do not trigger reload
- **WHEN** user changes only llm.model or other non-scheduler settings and saves
- **THEN** the scheduler SHALL NOT be stopped or restarted

### Requirement: Config change emits WebSocket event

The system SHALL broadcast a `config_changed` WebSocket event to all connected clients when configuration is updated via the API.

#### Scenario: Config saved triggers broadcast
- **WHEN** PATCH /api/config succeeds
- **THEN** the server SHALL broadcast a `config_changed` event with `data.changedKeys` listing the top-level config keys that were modified

#### Scenario: WebSocket event includes scheduler change details
- **WHEN** scheduler config is modified
- **THEN** the `config_changed` event data SHALL include `schedulerChanged: true` to indicate the scheduler needs reload

### Requirement: Analysis in progress is not interrupted by reload

The system SHALL preserve a running analysis task when the scheduler is reloaded.

#### Scenario: Reload during active analysis
- **WHEN** a scheduler reload is triggered while an analysis task is running
- **THEN** the system SHALL allow the running analysis to complete, and the new scheduler SHALL skip any trigger that occurs while the analysis is still running

### Requirement: Daemon logs scheduler reload events

The system SHALL log scheduler reload events for observability.

#### Scenario: Successful reload logged
- **WHEN** the scheduler successfully reloads with new config
- **THEN** the daemon log SHALL contain entries for: scheduler stopped, new config loaded, scheduler restarted with new settings

