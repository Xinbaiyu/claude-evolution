## ADDED Requirements

### Requirement: Timepoints scheduling mode
The system SHALL support a `timepoints` scheduling mode where the user configures a list of specific daily times (HH:MM format) at which analysis is triggered.

#### Scenario: User configures timepoints via config
- **WHEN** `scheduler.interval` is set to `"timepoints"` and `scheduler.scheduleTimes` is `["06:00", "13:00", "16:00"]`
- **THEN** the scheduler SHALL create cron tasks that trigger analysis at 06:00, 13:00, and 16:00 daily in the system's local timezone

#### Scenario: Timepoints format validation
- **WHEN** a `scheduleTimes` entry does not match the `HH:MM` format (e.g. `"25:00"`, `"6am"`, `"1300"`)
- **THEN** the system SHALL reject the configuration with a validation error

#### Scenario: Maximum timepoints limit
- **WHEN** the user attempts to configure more than 12 timepoints
- **THEN** the system SHALL reject the configuration with a validation error

#### Scenario: Empty timepoints array
- **WHEN** `scheduler.interval` is `"timepoints"` but `scheduleTimes` is empty or not provided
- **THEN** the system SHALL disable the scheduler and log a warning

### Requirement: CronScheduler multi-task support
The `CronScheduler` SHALL support managing multiple concurrent cron tasks, one per configured time point.

#### Scenario: Starting with multiple timepoints
- **WHEN** the scheduler starts with `scheduleTimes: ["06:00", "07:00", "13:00", "16:00"]`
- **THEN** the scheduler SHALL create 4 independent cron tasks, each triggering at the specified time

#### Scenario: Stopping all tasks
- **WHEN** `stop()` is called
- **THEN** all cron tasks SHALL be stopped and cleaned up

#### Scenario: Concurrent execution prevention
- **WHEN** two timepoints are close together and one analysis is still running when the next triggers
- **THEN** the second trigger SHALL be skipped with a log message

### Requirement: Init command timepoints mode
The `init` command SHALL offer a "定时模式" option in the scheduling frequency step, allowing users to input specific time points.

#### Scenario: User selects timepoints mode in init
- **WHEN** user selects "定时模式 (指定每天的具体时间)" during init
- **THEN** the system SHALL prompt for time points input in comma-separated HH:MM format

#### Scenario: User enters valid timepoints
- **WHEN** user enters `"06:00, 13:00, 16:00"`
- **THEN** the config SHALL be saved with `interval: "timepoints"` and `scheduleTimes: ["06:00", "13:00", "16:00"]`

#### Scenario: User enters invalid timepoints
- **WHEN** user enters an invalid time format
- **THEN** the system SHALL show an error and re-prompt

### Requirement: WebUI timepoints configuration
The WebUI Settings scheduler tab SHALL provide a UI for managing time points when timepoints mode is selected.

#### Scenario: Switching to timepoints mode
- **WHEN** user selects "定时模式" from the scheduling mode dropdown
- **THEN** the interval selector SHALL be hidden and a time points editor SHALL be displayed

#### Scenario: Adding a time point
- **WHEN** user clicks the add button and selects a time using the time picker
- **THEN** the time point SHALL be added to the list and saved to config

#### Scenario: Removing a time point
- **WHEN** user clicks the delete button next to a time point
- **THEN** the time point SHALL be removed from the list and saved to config

#### Scenario: Switching back to interval mode
- **WHEN** user selects an interval option (6h/12h/24h) from the mode dropdown
- **THEN** the time points editor SHALL be hidden and the interval selector SHALL be shown

### Requirement: Dashboard status display for timepoints
The daemon status API and Dashboard SHALL correctly display scheduling information for both interval and timepoints modes.

#### Scenario: Status API returns timepoints info
- **WHEN** scheduler is in timepoints mode with `scheduleTimes: ["06:00", "13:00"]`
- **THEN** `GET /api/daemon/status` SHALL return `scheduler.mode: "timepoints"`, `scheduler.scheduleTimes: ["06:00", "13:00"]`, and `scheduler.nextAnalysis` set to the nearest upcoming time point

#### Scenario: Dashboard displays timepoints schedule
- **WHEN** scheduler is in timepoints mode
- **THEN** the Dashboard SHALL display the configured time points and highlight the next upcoming one
