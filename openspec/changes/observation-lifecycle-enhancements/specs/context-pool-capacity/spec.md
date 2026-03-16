## ADDED Requirements

### Requirement: Context Pool SHALL enforce capacity limits
The system SHALL limit Context Pool size using configurable thresholds and automatic archival of low-scoring observations.

#### Scenario: Context Pool within capacity
- **WHEN** Context Pool observation count ≤ configured maxSize
- **THEN** system SHALL skip capacity enforcement
- **THEN** no observations SHALL be archived

#### Scenario: Context Pool exceeds capacity
- **WHEN** Context Pool observation count > configured maxSize
- **THEN** system SHALL calculate scores for all unpinned observations
- **THEN** system SHALL archive lowest-scoring observations until count ≤ targetSize
- **THEN** archived observations SHALL have archiveReason='context_capacity'

#### Scenario: Capacity enforcement with pinned observations
- **WHEN** Context Pool contains pinned observations
- **THEN** pinned observations SHALL NOT participate in capacity calculations
- **THEN** only unpinned observations SHALL be scored and potentially archived
- **THEN** final pool size MAY exceed targetSize if many observations are pinned

### Requirement: Context Pool SHALL use temporal decay scoring
The system SHALL score unpinned observations using decayed confidence and mentions to rank observations for capacity enforcement.

#### Scenario: Calculate observation score
- **WHEN** system calculates score for unpinned observation
- **THEN** score SHALL equal `confidence × 0.5^(age_days / halfLifeDays) × mentions`
- **THEN** halfLifeDays SHALL be read from config (default 90)

#### Scenario: Archive lowest-scoring observations
- **WHEN** Context Pool capacity enforcement runs
- **THEN** observations SHALL be sorted by score in descending order
- **THEN** top (targetSize - pinnedCount) observations SHALL be kept
- **THEN** remaining observations SHALL be archived with reason='context_capacity'

### Requirement: Context Pool capacity SHALL be configurable
The system SHALL allow users to configure Context Pool capacity parameters through config file and Web UI.

#### Scenario: Read capacity config
- **WHEN** system loads capacity configuration
- **THEN** config SHALL include targetSize (default 50)
- **THEN** config SHALL include maxSize (default 80)
- **THEN** config SHALL include halfLifeDays (default 90)
- **THEN** config SHALL include enabled flag (default true)

#### Scenario: Capacity disabled
- **WHEN** config.learning.capacity.context.enabled = false
- **THEN** system SHALL skip Context Pool capacity enforcement entirely
- **THEN** Context Pool MAY grow unbounded

#### Scenario: Invalid configuration
- **WHEN** config has targetSize > maxSize
- **THEN** system SHALL log warning and use maxSize for both values
