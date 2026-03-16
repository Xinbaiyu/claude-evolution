## ADDED Requirements

### Requirement: LLM merge SHALL detect similarity to ignored observations
The system SHALL check merged observations against archived observations with `manualOverride.action === 'ignore'` and calculate similarity scores.

#### Scenario: High similarity to ignored observation
- **WHEN** LLM merge produces an observation similar to an archived ignored observation (similarity > 0.8)
- **THEN** system logs the similarity with both observation IDs and similarity percentage

#### Scenario: Low similarity to ignored observation
- **WHEN** LLM merge produces an observation with similarity ≤ 0.8 to any ignored observation
- **THEN** system proceeds with normal merge without ignore inheritance

### Requirement: Similar observations SHALL inherit ignore state
The system SHALL automatically set `manualOverride.action = 'ignore'` on merged observations that match ignored observations above the similarity threshold.

#### Scenario: Inherit ignore state from similar observation
- **WHEN** merged observation has similarity > 0.8 to an ignored observation
- **THEN** merged observation SHALL have `manualOverride.action = 'ignore'`
- **THEN** merged observation SHALL have `manualOverride.inheritedFrom` set to ignored observation's ID
- **THEN** merged observation SHALL have `mergeInfo.mergedFromIgnored = true`
- **THEN** merged observation SHALL have `mergeInfo.originalIgnoredId` set to ignored observation's ID

#### Scenario: Auto-archive inherited ignore observations
- **WHEN** merged observation inherits ignore state
- **THEN** observation SHALL be automatically moved to Archive Pool
- **THEN** observation SHALL have `archiveReason = 'user_ignored'`

### Requirement: Ignore inheritance SHALL be logged
The system SHALL log all ignore state inheritance events with sufficient detail for debugging.

#### Scenario: Log inheritance decision
- **WHEN** observation inherits ignore state
- **THEN** log SHALL include new observation ID
- **THEN** log SHALL include original ignored observation ID
- **THEN** log SHALL include similarity percentage
- **THEN** log SHALL include message explaining inheritance action
