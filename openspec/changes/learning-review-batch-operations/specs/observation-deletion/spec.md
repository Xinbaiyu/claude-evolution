## MODIFIED Requirements

### Requirement: Delete observation from active or context pool
The system SHALL remove observations from active or context pools when deletion is requested.

**PREVIOUS BEHAVIOR**: Observations were permanently deleted from the system with no recovery option.

**NEW BEHAVIOR**: Observations are moved to archived pool with metadata for potential restoration and deletion tracking.

#### Scenario: Delete from active pool
- **WHEN** DELETE request is made for observation in active pool
- **THEN** observation is removed from active.json AND added to archived.json with archiveReason='user_deleted', archiveTimestamp=<current ISO 8601>, suppressSimilar=true

#### Scenario: Delete from context pool
- **WHEN** DELETE request is made for observation in context pool
- **THEN** observation is removed from context.json AND added to archived.json with deletion metadata

#### Scenario: Delete with archive reason
- **WHEN** DELETE request includes optional reason parameter
- **THEN** archived observation receives custom archiveReason field (e.g., 'user_deleted: test noise')

#### Scenario: Observation not found
- **WHEN** DELETE request is made for non-existent observation ID
- **THEN** system returns 404 error with message "Observation not found: <id>"

### Requirement: Emit WebSocket event on deletion
The system SHALL emit WebSocket event when observation is deleted (archived).

**PREVIOUS BEHAVIOR**: No specific event documentation existed for delete operations.

**NEW BEHAVIOR**: System emits `observation_archived` WebSocket event with observation ID, type, and reason.

#### Scenario: WebSocket notification on delete
- **WHEN** observation is successfully archived
- **THEN** WebSocket event 'observation_archived' is emitted with payload: { id, type, reason: 'user_deleted' }

#### Scenario: Frontend receives archive event
- **WHEN** frontend WebSocket client receives 'observation_archived' event
- **THEN** UI removes observation from active/context view AND increments archived pool count

## ADDED Requirements

### Requirement: Restore archived observation to active pool
The system SHALL provide API endpoint to restore observations from archived pool back to active pool.

#### Scenario: Successful restore
- **WHEN** POST /api/learning/restore is called with observation ID in archived pool
- **THEN** observation is removed from archived.json AND added to active.json AND archiveReason/archiveTimestamp/suppressSimilar fields are cleared

#### Scenario: Restore non-existent archived observation
- **WHEN** restore request is made for observation not in archived pool
- **THEN** system returns 404 error "Observation not found in archive: <id>"
