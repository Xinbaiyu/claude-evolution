# Legacy Suggestion Migration

Migration specification for converting v0.2.x suggestion data to v0.3.0 observation format.

## ADDED Requirements

### Requirement: Migration command available

The system SHALL provide a CLI command to migrate legacy suggestion data to the new observation format.

#### Scenario: Command exists
- **WHEN** user runs `claude-evolution migrate-suggestions`
- **THEN** system executes migration process

#### Scenario: Command not available after migration
- **WHEN** user has already migrated once
- **THEN** system displays message "Already migrated" and exits gracefully

### Requirement: Detect legacy data

The system SHALL detect the presence of legacy `learned/pending.json` file before migration.

#### Scenario: Legacy data exists
- **WHEN** `~/.claude-evolution/learned/pending.json` exists
- **THEN** system proceeds with migration

#### Scenario: No legacy data
- **WHEN** `~/.claude-evolution/learned/pending.json` does not exist
- **THEN** system displays "No legacy data found" and exits

#### Scenario: Already migrated
- **WHEN** `~/.claude-evolution/learned/.migrated` marker exists
- **THEN** system skips migration and informs user

### Requirement: Transform suggestion to observation

The system SHALL convert each legacy suggestion to ObservationWithMetadata format.

#### Scenario: Preference suggestion conversion
- **WHEN** pending.json contains a preference suggestion with confidence 0.8
- **THEN** system creates observation with:
  - `type: "preference"`
  - `confidence: 0.8`
  - `originalConfidence: 0.8`
  - `mentions: frequency || 1`
  - `inContext: false`

#### Scenario: Pattern suggestion conversion
- **WHEN** pending.json contains a pattern suggestion
- **THEN** system creates observation with `type: "pattern"` and appropriate metadata

#### Scenario: Workflow suggestion conversion
- **WHEN** pending.json contains a workflow suggestion
- **THEN** system creates observation with `type: "workflow"` and appropriate metadata

### Requirement: Preserve evidence and timestamps

The system SHALL preserve evidence references and timestamp information during migration.

#### Scenario: Evidence preserved
- **WHEN** suggestion has evidence array `["session-1", "session-2"]`
- **THEN** observation includes same evidence array

#### Scenario: Timestamps set
- **WHEN** suggestion has createdAt timestamp
- **THEN** observation uses it for both firstSeen and lastSeen

#### Scenario: Missing timestamps
- **WHEN** suggestion lacks createdAt
- **THEN** system uses current timestamp for firstSeen and lastSeen

### Requirement: Write to active pool

The system SHALL append migrated observations to `memory/observations/active.json`.

#### Scenario: Merge with existing observations
- **WHEN** active.json already contains observations
- **THEN** system appends migrated items without overwriting existing

#### Scenario: Create if missing
- **WHEN** active.json does not exist
- **THEN** system creates new file with migrated observations

### Requirement: Backup original data

The system SHALL create backup of original pending.json before migration.

#### Scenario: Backup created
- **WHEN** migration begins
- **THEN** system copies pending.json to pending.json.backup-YYYYMMDD

#### Scenario: Preserve original
- **WHEN** migration completes
- **THEN** original pending.json remains unmodified

### Requirement: Migration marker

The system SHALL create a marker file after successful migration.

#### Scenario: Marker created
- **WHEN** migration completes successfully
- **THEN** system creates `~/.claude-evolution/learned/.migrated` file

#### Scenario: Prevent re-migration
- **WHEN** user runs migrate command again
- **THEN** system detects marker and skips migration

### Requirement: Migration summary

The system SHALL display a summary of migration results.

#### Scenario: Success summary
- **WHEN** migration completes
- **THEN** system displays:
  - Number of suggestions migrated
  - Number of observations created
  - Path to backup file
  - Next steps (use WebUI Learning Review)

#### Scenario: Error reporting
- **WHEN** migration fails
- **THEN** system displays error message and preserves original data

### Requirement: Rollback capability

The system SHALL allow users to rollback migration if needed.

#### Scenario: Rollback instructions
- **WHEN** migration summary displayed
- **THEN** system includes rollback instructions in output

#### Scenario: Manual rollback
- **WHEN** user deletes migration marker and restored backup
- **THEN** system returns to pre-migration state

## REMOVED Requirements

### Requirement: Manual approval workflow
**Reason**: Replaced by automatic observation promotion based on confidence and mentions
**Migration**: Use WebUI at /learning-review to manually promote/demote observations

### Requirement: CLI review command
**Reason**: WebUI provides superior interface with tier visualization and filtering
**Migration**: Access http://localhost:10010/learning-review instead of `claude-evolution review`

### Requirement: Separate pending/approved/rejected files
**Reason**: Unified observation pools (active/context/archived) provide better lifecycle management
**Migration**: Pending → Active, Approved → Context (via promotion), Rejected → Archived
