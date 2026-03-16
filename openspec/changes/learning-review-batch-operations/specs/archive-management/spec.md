## ADDED Requirements

### Requirement: Observations moved to archived pool on deletion
The system SHALL move deleted observations to the archived pool instead of permanently removing them from the system.

#### Scenario: Single observation deletion
- **WHEN** user deletes an observation from active pool
- **THEN** observation is removed from active.json AND added to archived.json with archiveReason = 'user_deleted'

#### Scenario: Batch observation deletion
- **WHEN** user deletes 20 observations via batch operation
- **THEN** all 20 observations are removed from source pool AND added to archived.json

### Requirement: Archive metadata on deletion
The system SHALL attach deletion metadata to archived observations.

#### Scenario: Archive metadata structure
- **WHEN** observation is deleted
- **THEN** observation gains fields: archiveReason='user_deleted', archiveTimestamp=<ISO 8601>, suppressSimilar=true

### Requirement: Archived pool display
The system SHALL display archived observations in a dedicated "Archived" tab with deletion metadata visible.

#### Scenario: View archived observations
- **WHEN** user navigates to "Archived" tab
- **THEN** system displays all archived observations sorted by archiveTimestamp descending

#### Scenario: Archive reason display
- **WHEN** viewing archived observation
- **THEN** card shows badge indicating "Deleted on <date>" or "Expired on <date>" based on archiveReason

### Requirement: Restore observation from archive
The system SHALL allow users to restore archived observations back to the active pool.

#### Scenario: Successful restore
- **WHEN** user clicks "Restore" on archived observation
- **THEN** observation is removed from archived.json AND added to active.json AND archiveReason/archiveTimestamp fields are cleared

#### Scenario: Restore removes suppression flag
- **WHEN** observation with suppressSimilar=true is restored
- **THEN** suppressSimilar flag is removed AND future similar observations are not blocked

### Requirement: Permanent deletion after retention period
The system SHALL automatically delete archived observations older than the configured retention period.

#### Scenario: Retention period expiry
- **WHEN** archived observation is older than 30 days (configurable)
- **THEN** observation is permanently deleted from archived.json during next cleanup cycle

#### Scenario: Retention period display
- **WHEN** viewing archived observation
- **THEN** card shows "Will be deleted in X days" countdown

### Requirement: Archive search and filtering
The system SHALL support searching and filtering archived observations by type, date, and archive reason.

#### Scenario: Filter archived by reason
- **WHEN** user selects "user_deleted" filter in archived tab
- **THEN** only observations with archiveReason='user_deleted' are displayed

#### Scenario: Search archived observations
- **WHEN** user searches for "console.log" in archived tab
- **THEN** system displays matching archived observations

### Requirement: Bulk restore from archive
The system SHALL support batch restoration of multiple archived observations.

#### Scenario: Batch restore selection
- **WHEN** user selects 5 archived observations AND clicks "Restore Selected"
- **THEN** all 5 observations are moved back to active pool AND archiveTimestamp is cleared
