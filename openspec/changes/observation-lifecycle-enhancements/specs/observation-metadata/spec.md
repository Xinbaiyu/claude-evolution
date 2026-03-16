## ADDED Requirements

### Requirement: ObservationWithMetadata SHALL support pinning fields
The observation data structure SHALL include fields to track pin status.

#### Scenario: Observation with pin metadata
- **WHEN** observation is pinned by user
- **THEN** observation SHALL have `pinned: true`
- **THEN** observation SHALL have `pinnedBy: 'user'`
- **THEN** observation SHALL have `pinnedAt` timestamp in ISO 8601 format

#### Scenario: Unpinned observation
- **WHEN** observation is not pinned
- **THEN** observation's `pinned` field SHALL be undefined or false
- **THEN** observation SHALL NOT have `pinnedBy` or `pinnedAt` fields

#### Scenario: Backward compatibility with existing observations
- **WHEN** system loads observation without pinning fields
- **THEN** observation SHALL be treated as unpinned (pinned = false)
- **THEN** no migration or schema upgrade SHALL be required

### Requirement: ObservationWithMetadata SHALL support merge inheritance tracking
The observation data structure SHALL track when ignore states are inherited from other observations during LLM merge.

#### Scenario: Observation with merge inheritance metadata
- **WHEN** observation inherits ignore state from another observation
- **THEN** observation SHALL have `mergeInfo.mergedFromIgnored: true`
- **THEN** observation SHALL have `mergeInfo.originalIgnoredId` set to source observation ID
- **THEN** observation SHALL have `manualOverride.inheritedFrom` set to source observation ID

#### Scenario: Observation without merge inheritance
- **WHEN** observation does not inherit ignore state
- **THEN** observation's `mergeInfo` field SHALL be undefined
- **THEN** observation's `manualOverride.inheritedFrom` field SHALL be undefined

### Requirement: ObservationWithMetadata SHALL support granular archive reasons
The observation data structure SHALL distinguish between different capacity archival sources.

#### Scenario: Active Pool capacity archival
- **WHEN** observation is archived due to Active Pool capacity enforcement
- **THEN** observation SHALL have `archiveReason: 'active_capacity'`

#### Scenario: Context Pool capacity archival
- **WHEN** observation is archived due to Context Pool capacity enforcement
- **THEN** observation SHALL have `archiveReason: 'context_capacity'`

#### Scenario: Archive reason compatibility
- **WHEN** system encounters observation with archiveReason='capacity_control'
- **THEN** system SHALL treat it as valid (backward compatibility)
- **THEN** new capacity archival SHALL use specific 'active_capacity' or 'context_capacity' reasons

### Requirement: CapacityConfig SHALL support Context Pool configuration
The capacity configuration structure SHALL include Context Pool specific settings.

#### Scenario: Context Pool capacity config structure
- **WHEN** system loads capacity configuration
- **THEN** config SHALL include learning.capacity.context object
- **THEN** context config SHALL include enabled: boolean
- **THEN** context config SHALL include targetSize: number
- **THEN** context config SHALL include maxSize: number
- **THEN** context config SHALL include halfLifeDays: number

#### Scenario: Context Pool config defaults
- **WHEN** context capacity config is not present in config file
- **THEN** system SHALL use defaults: enabled=true, targetSize=50, maxSize=80, halfLifeDays=90
