## ADDED Requirements

### Requirement: Promotion without duplicate blocking
The system SHALL promote any observation that reaches gold tier (decayedConfidence >= autoConfidence AND mentions >= autoMentions) directly to the context pool without checking for existing observations of the same type.

#### Scenario: Gold-tier observation promoted despite same-type existing in context
- **WHEN** an active pool observation has confidence >= 0.90 and mentions >= 10 and the context pool already contains an observation with the same `item.type`
- **THEN** the system SHALL promote the observation to the context pool without blocking

#### Scenario: Multiple gold-tier observations of same type promoted
- **WHEN** multiple active pool observations of type preference with `item.type = "communication"` all reach gold tier
- **THEN** the system SHALL promote all of them to the context pool

### Requirement: Context pool LLM merge after promotion
The system SHALL execute an LLM merge step on the context pool after auto-promotion completes and before context capacity control runs. The merge SHALL consolidate semantically similar observations into a single, more comprehensive observation.

#### Scenario: Two similar communication preferences merged
- **WHEN** the context pool contains two preference observations with `item.type = "communication"` and semantically overlapping descriptions
- **THEN** the LLM merge SHALL combine them into one observation with merged evidence, summed mentions, max confidence, earliest firstSeen, and latest lastSeen

#### Scenario: Context merge step position in learning cycle
- **WHEN** a learning cycle executes
- **THEN** the context merge step SHALL run after Step 5 (Auto-Promotion) and before Step 5.5 (Context Capacity Control)

### Requirement: Pinned observations excluded from merge
The system SHALL NOT include pinned observations (`pinned === true`) in the LLM merge input. Pinned observations SHALL remain unchanged after the merge step.

#### Scenario: Pinned observation preserved during merge
- **WHEN** the context pool contains a pinned observation and a non-pinned observation with similar content
- **THEN** the pinned observation SHALL remain unchanged and the non-pinned observation SHALL be processed by LLM merge independently

#### Scenario: All observations pinned
- **WHEN** all observations in the context pool have `pinned === true`
- **THEN** the system SHALL skip the LLM merge step entirely

### Requirement: Conflict resolution during merge
The LLM merge SHALL identify contradictory observations (e.g., old preference says "prefer verbose comments", new observation says "prefer minimal comments") and resolve them by retaining the observation with the more recent `lastSeen` timestamp. If timestamps are close (within 24 hours), the observation with higher `mentions` count SHALL be preferred.

#### Scenario: Contradictory preferences resolved by recency
- **WHEN** the context pool contains observation A (lastSeen: 2026-03-10, "prefer detailed comments") and observation B (lastSeen: 2026-03-20, "prefer minimal comments")
- **THEN** the LLM merge SHALL retain observation B's preference and archive observation A

#### Scenario: Contradictory preferences resolved by mentions when timestamps close
- **WHEN** the context pool contains observation A (lastSeen: 2026-03-20T10:00, mentions: 5) and observation B (lastSeen: 2026-03-20T12:00, mentions: 50) with contradictory content
- **THEN** the LLM merge SHALL retain observation B (higher mentions)

### Requirement: Merge preserves context pool metadata
All observations output from the context merge step SHALL retain `inContext: true`. Merged observations SHALL have `mergedFrom` populated with the IDs of source observations. The `promotedAt` field SHALL retain the earliest promotion timestamp from the merged sources.

#### Scenario: Merged observation retains context metadata
- **WHEN** two context pool observations are merged
- **THEN** the resulting observation SHALL have `inContext: true`, `mergedFrom: [id1, id2]`, and `promotedAt` equal to the earlier of the two source `promotedAt` values

### Requirement: Merge failure fallback
If the LLM merge step fails (API error, parse error, timeout), the system SHALL fall back to using the unmerged context pool and log a warning. The learning cycle SHALL NOT fail due to context merge failure.

#### Scenario: LLM API call fails during context merge
- **WHEN** the LLM API returns an error during context pool merge
- **THEN** the system SHALL log a warning, skip the merge step, and continue the learning cycle with the unmerged context pool

#### Scenario: LLM returns unparseable response
- **WHEN** the LLM response cannot be parsed as valid JSON
- **THEN** the system SHALL fall back to the unmerged context pool and log the parse error
