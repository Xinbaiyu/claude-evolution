## ADDED Requirements

### Requirement: Users SHALL restore observations from Archive Pool
The system SHALL provide API endpoints allowing users to restore archived observations to Active or Context pools.

#### Scenario: Restore single observation to Active Pool
- **WHEN** user calls POST /api/learning/unignore with valid observation ID and targetPool='active'
- **THEN** observation SHALL be removed from Archive Pool
- **THEN** observation SHALL be added to Active Pool
- **THEN** observation's `archiveTimestamp` and `archiveReason` SHALL be cleared
- **THEN** observation's `manualOverride` SHALL be cleared or set to action='restore'

#### Scenario: Restore single observation to Context Pool
- **WHEN** user calls POST /api/learning/unignore with valid observation ID and targetPool='context'
- **THEN** observation SHALL be removed from Archive Pool
- **THEN** observation SHALL be added to Context Pool
- **THEN** CLAUDE.md SHALL be regenerated

#### Scenario: Batch restore observations
- **WHEN** user calls POST /api/learning/batch/unignore with array of observation IDs and targetPool
- **THEN** all specified observations SHALL be restored to the target pool
- **THEN** CLAUDE.md SHALL be regenerated once after all observations are restored

#### Scenario: Restore nonexistent observation
- **WHEN** user calls unignore API with observation ID not found in Archive Pool
- **THEN** system SHALL return 404 error with message "Observation not found in archive"

### Requirement: Archive Pool UI SHALL support restoration
The Web UI SHALL provide an Archive Pool management interface allowing users to browse and restore archived observations.

#### Scenario: View archived observations
- **WHEN** user navigates to Archive Pool page
- **THEN** system SHALL display all archived observations with archive reason and timestamp
- **THEN** observations SHALL be filterable by archive reason (user_ignored, capacity_control, expired, etc.)

#### Scenario: Restore from UI to Active
- **WHEN** user selects archived observation(s) and clicks "Restore to Active"
- **THEN** system SHALL call unignore API with targetPool='active'
- **THEN** UI SHALL remove restored observations from Archive Pool view
- **THEN** UI SHALL show success notification

#### Scenario: Restore from UI to Context
- **WHEN** user selects archived observation(s) and clicks "Restore to Context"
- **THEN** system SHALL call unignore API with targetPool='context'
- **THEN** UI SHALL remove restored observations from Archive Pool view
- **THEN** UI SHALL show success notification with note "CLAUDE.md updated"

#### Scenario: Batch restore multiple observations
- **WHEN** user selects multiple archived observations and chooses restore action
- **THEN** system SHALL restore all selected observations to the chosen target pool
- **THEN** UI SHALL update to reflect all restorations in a single operation
