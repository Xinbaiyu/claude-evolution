## ADDED Requirements

### Requirement: LLM merge checks archived observations
The system SHALL enhance the LLM merge process to check new observations against archived observations marked as user_deleted.

#### Scenario: Similarity detection during merge
- **WHEN** new observation is being merged AND archived pool contains similar observation with archiveReason='user_deleted'
- **THEN** system calculates similarity score between new and archived observations

#### Scenario: High similarity to deleted observation
- **WHEN** similarity score exceeds 80% threshold
- **THEN** new observation receives similarToDeleted metadata with deletedId, deletedAt, and similarity score

### Requirement: Similarity warning display
The system SHALL display visual warnings on observations similar to previously deleted ones.

#### Scenario: Warning badge on observation card
- **WHEN** observation has similarToDeleted metadata
- **THEN** card displays "⚠️ Similar to deleted observation" warning badge

#### Scenario: Similarity details expansion
- **WHEN** user clicks on similarity warning badge
- **THEN** system displays expanded details: "You deleted a similar observation on <date>. Deleted: <description>. Current: <description>. Similarity: 85%"

### Requirement: User actions on similar observations
The system SHALL allow users to take action on observations flagged as similar to deleted ones.

#### Scenario: Delete again action
- **WHEN** user clicks "Delete Again" on observation with similarity warning
- **THEN** observation is archived with archiveReason='user_deleted' AND suppressSimilar flag set

#### Scenario: Keep this time action
- **WHEN** user clicks "Keep This Time" on observation with similarity warning
- **THEN** similarToDeleted metadata is removed AND observation treated as normal

#### Scenario: Compare action
- **WHEN** user clicks "Compare" on observation with similarity warning
- **THEN** side-by-side comparison modal displays deleted observation vs current observation

### Requirement: Suppression counter tracking
The system SHALL track how many times similar observations have been blocked or re-deleted.

#### Scenario: Update suppression counter
- **WHEN** observation is deleted AND matches archived observation with suppressSimilar=true
- **THEN** archived observation's lastBlockedAt timestamp is updated AND suppressionCount is incremented

#### Scenario: Display suppression statistics
- **WHEN** viewing archived observation with suppressionCount > 0
- **THEN** card shows "Similar observation reappeared and was deleted X times since"

### Requirement: Similarity threshold configuration
The system SHALL use a configurable similarity threshold for detecting similar observations.

#### Scenario: Default similarity threshold
- **WHEN** no custom threshold is configured
- **THEN** system uses 80% similarity threshold for detection

#### Scenario: Adjust sensitivity via threshold
- **WHEN** threshold is set to 90%
- **THEN** only very similar observations (90%+ match) trigger warnings

### Requirement: False positive handling
The system SHALL allow users to dismiss false positive similarity warnings.

#### Scenario: Dismiss warning permanently
- **WHEN** user clicks "Not Similar" on warning badge
- **THEN** similarToDeleted metadata is removed AND archived observation is marked to exclude from future comparisons with this observation ID

### Requirement: Bulk similarity review
The system SHALL provide bulk actions for observations with similarity warnings.

#### Scenario: Batch delete all flagged observations
- **WHEN** user filters for observations with similarity warnings AND selects "Delete All Flagged"
- **THEN** all observations with similarToDeleted metadata are archived in batch operation
