## ADDED Requirements

### Requirement: Cross-pool deduplication after LLM merge
After LLM Merge Stage 2.5 completes, the system SHALL compare each output observation against all context pool observations. If the similarity score (using the fixed `calculateSimilarity`) exceeds 0.7, the observation SHALL be absorbed into the matching context pool entry rather than being stored as a new active pool observation.

#### Scenario: New observation matches existing context pool entry
- **WHEN** LLM Merge outputs an observation with content "优先使用中文进行沟通"
- **AND** context pool contains an observation with content "使用中文进行技术沟通和交互" (similarity > 0.7)
- **THEN** the context pool entry's `mentions` SHALL be incremented by the new observation's `mentions`
- **AND** the context pool entry's `confidence` SHALL be set to the maximum of both values
- **AND** the context pool entry's `lastSeen` SHALL be updated to the current timestamp
- **AND** the new observation SHALL NOT be added to the active pool

#### Scenario: New observation does not match any context pool entry
- **WHEN** LLM Merge outputs an observation about "prefer TypeScript strict mode"
- **AND** no context pool observation has similarity > 0.7
- **THEN** the observation SHALL proceed through the normal pipeline (remain in active pool for future promotion)

#### Scenario: Multiple new observations match same context entry
- **WHEN** two output observations both match the same context pool entry with similarity > 0.7
- **THEN** the context pool entry SHALL accumulate mentions from both
- **AND** neither observation SHALL be added to the active pool

### Requirement: Cross-pool dedup SHALL load context pool as parameter
The `mergeLLM` function SHALL accept an optional `contextObservations` parameter. Context pool data SHALL be loaded by the caller (learning orchestrator) and passed in, keeping `mergeLLM` free of direct file IO.

#### Scenario: Context observations provided
- **WHEN** `mergeLLM` is called with `contextObservations` containing 15 entries
- **THEN** cross-pool dedup SHALL compare merge output against all 15 entries

#### Scenario: Context observations not provided
- **WHEN** `mergeLLM` is called without `contextObservations` parameter
- **THEN** cross-pool dedup stage SHALL be skipped entirely
- **AND** all observations SHALL proceed to the next stage unchanged

### Requirement: Cross-pool dedup SHALL persist context pool updates
When observations are absorbed into context pool entries, the updated context pool SHALL be persisted to disk. The return value of `mergeLLM` SHALL include metadata indicating which observations were absorbed and which context entries were updated.

#### Scenario: Absorbed observations reported in output
- **WHEN** 3 out of 10 merge output observations are absorbed into context pool
- **THEN** `mergeLLM` SHALL return only the 7 non-absorbed observations as active pool candidates
- **AND** the function's log output SHALL report "3 observation(s) absorbed into context pool"

### Requirement: Cross-pool dedup stage ordering
Cross-pool dedup SHALL execute after Stage 2.5 (ignore inheritance) and before Stage 3 (deleted similarity check). This ensures only fully processed, non-ignored observations are compared against the context pool.

#### Scenario: Ignored observation skips cross-pool dedup
- **WHEN** an observation inherits ignore state in Stage 2.5
- **THEN** it SHALL NOT be compared against context pool entries
- **AND** it SHALL be archived directly without affecting context pool
