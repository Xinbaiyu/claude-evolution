## ADDED Requirements

### Requirement: Skill file auto-installation
The system SHALL install a Skill file to `~/.claude/skills/remind.md` during `claude-evolution init`. The Skill file MUST describe when Claude should use it and how to call the daemon API.

#### Scenario: First-time installation
- **WHEN** user runs `claude-evolution init` and no Skill file exists
- **THEN** the system copies the Skill file to `~/.claude/skills/remind.md`

#### Scenario: Skill file already exists with older version
- **WHEN** user runs `claude-evolution init` and the existing Skill file has an older version tag
- **THEN** the system updates the Skill file to the latest version

#### Scenario: Skill file has user modifications
- **WHEN** user runs `claude-evolution init` and the Skill file exists without a version tag (user-modified)
- **THEN** the system skips installation and logs a warning

### Requirement: Skill triggers on reminder intent
The Skill file SHALL contain trigger conditions that match when the user expresses reminder intent in Chinese or English (e.g., "提醒我", "remind me", "下午3点", "at 3pm").

#### Scenario: User says "下午3点提醒我检查部署"
- **WHEN** Claude detects reminder intent via the Skill description
- **THEN** Claude parses the time to ISO 8601 format and calls the daemon API via `curl -X POST http://localhost:10010/api/reminders`

#### Scenario: User says "every morning at 9 remind me to check email"
- **WHEN** Claude detects recurring reminder intent
- **THEN** Claude converts "every morning at 9" to cron expression "0 9 * * *" and calls the API with type "recurring"

### Requirement: Skill handles daemon unavailability
The Skill SHALL instruct Claude to check if the daemon is running before creating a reminder.

#### Scenario: Daemon is not running
- **WHEN** Claude attempts to call the reminder API and the connection is refused
- **THEN** Claude informs the user that the daemon is not running and suggests starting it with `claude-evolution start`

### Requirement: Skill reports creation result
The Skill SHALL instruct Claude to report the reminder creation result to the user in a friendly format.

#### Scenario: Reminder created successfully
- **WHEN** the API returns success with reminder ID and trigger time
- **THEN** Claude confirms to the user: "已设置提醒：[message]，将在 [time] 通知你"

#### Scenario: Reminder creation fails
- **WHEN** the API returns an error
- **THEN** Claude reports the error to the user with actionable suggestions
