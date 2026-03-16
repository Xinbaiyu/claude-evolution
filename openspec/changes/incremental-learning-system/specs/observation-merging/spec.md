# Observation Merging Specification

## ADDED Requirements

### Requirement: System merges old and new observations using LLM

The system SHALL merge old observations from `memory/observations/active.json` with new observations from session analysis using a two-stage LLM process.

#### Scenario: Successful merge with deduplication
- **WHEN** scheduler completes session analysis with 15 new observations
- **AND** active.json contains 42 old observations
- **THEN** system invokes LLM merge with both datasets
- **AND** LLM returns merged observations with deduplicated entries
- **AND** merged observations preserve highest confidence and complete evidence chains

#### Scenario: No new observations detected
- **WHEN** scheduler completes session analysis with 0 new observations
- **THEN** system skips LLM merge step
- **AND** system proceeds to decay and promotion steps with existing observations

#### Scenario: First run with no old observations
- **WHEN** system runs for the first time
- **AND** active.json does not exist
- **THEN** system treats all new observations as merged result
- **AND** system initializes active.json with new observations

---

### Requirement: LLM identifies and merges similar observations

The system SHALL detect observations with >80% similarity and merge them based on type-specific rules.

#### Scenario: Merge similar preferences
- **WHEN** old observations contain "prefer async/await over callbacks"
- **AND** new observations contain "always use async/await syntax"
- **THEN** LLM identifies these as similar (same type: async pattern)
- **AND** system merges them into single observation
- **AND** merged observation has mentions = sum(2)
- **AND** merged observation has confidence = max(old, new)
- **AND** merged observation has evidence = concat(old, new) deduplicated

#### Scenario: Merge similar patterns
- **WHEN** old observations contain pattern: "problem: deep nesting → solution: early return"
- **AND** new observations contain pattern: "problem: nested if-else → solution: guard clauses"
- **THEN** LLM identifies these as similar (same problem domain)
- **AND** system merges them with consolidated solution text

#### Scenario: Keep distinct observations separate
- **WHEN** old observations contain "prefer TypeScript over JavaScript"
- **AND** new observations contain "use Zod for runtime validation"
- **THEN** LLM identifies these as distinct topics
- **AND** system keeps both observations without merging

---

### Requirement: System updates observation metadata during merge

The system SHALL update mentions, lastSeen, and confidence fields when merging observations.

#### Scenario: Update mentions count
- **WHEN** observation A (mentions: 5) merges with observation B (mentions: 3)
- **THEN** merged observation has mentions = 8

#### Scenario: Update lastSeen timestamp
- **WHEN** observation A (lastSeen: "2026-03-10") merges with observation B (lastSeen: "2026-03-14")
- **THEN** merged observation has lastSeen = "2026-03-14"

#### Scenario: Update confidence to maximum
- **WHEN** observation A (confidence: 0.85) merges with observation B (confidence: 0.92)
- **THEN** merged observation has confidence = 0.92

#### Scenario: Preserve firstSeen timestamp
- **WHEN** observation A (firstSeen: "2026-03-01") merges with observation B (firstSeen: "2026-03-10")
- **THEN** merged observation has firstSeen = "2026-03-01"

---

### Requirement: System records merge provenance

The system SHALL track which original observations were merged into each result.

#### Scenario: Record merged IDs
- **WHEN** observations with IDs ["obs-123", "obs-456", "obs-789"] are merged
- **THEN** merged observation includes mergedFrom: ["obs-123", "obs-456", "obs-789"]
- **AND** system logs merge operation to audit trail

#### Scenario: Single observation not merged
- **WHEN** observation "obs-999" has no similar matches
- **THEN** observation passes through unmodified
- **AND** mergedFrom field is empty or omitted

---

### Requirement: System applies confidence adjustments after merge

The system SHALL invoke LLM to adjust confidence (±5%) based on evidence quality, clarity, and consistency.

#### Scenario: Increase confidence for diverse evidence
- **WHEN** merged observation has evidence from 5 different sessions
- **THEN** LLM increases confidence by +5%

#### Scenario: Decrease confidence for single-session evidence
- **WHEN** merged observation has all evidence from same session
- **THEN** LLM decreases confidence by -5%

#### Scenario: Decrease confidence for conflicting rules
- **WHEN** merged observation conflicts with promoted rule in context.json
- **THEN** LLM decreases confidence by -10%

#### Scenario: Increase confidence for clear descriptions
- **WHEN** merged observation has specific, actionable description
- **THEN** LLM increases confidence by +5%

---

### Requirement: System handles LLM merge failures gracefully

The system SHALL fall back to safe defaults if LLM merge fails.

#### Scenario: LLM timeout during merge
- **WHEN** LLM merge request times out after 30 seconds
- **THEN** system logs error with details
- **AND** system keeps all old observations unchanged
- **AND** system appends new observations without merge
- **AND** system sends warning notification to user

#### Scenario: LLM returns invalid JSON
- **WHEN** LLM response is not valid JSON
- **THEN** system logs parse error
- **AND** system retries merge once with stricter prompt
- **AND** if retry fails, system falls back to no-merge mode

#### Scenario: LLM merge reduces count by >50%
- **WHEN** old observations = 50
- **AND** merged observations = 20 (60% reduction)
- **THEN** system logs warning: "Aggressive merge detected"
- **AND** system prompts user to review merge quality
- **AND** system optionally skips merge and keeps old + new separate

---

### Requirement: System limits merge input size for cost control

The system SHALL limit merge input to prevent excessive token usage.

#### Scenario: Limit old observations to top 50
- **WHEN** active.json contains 75 observations
- **THEN** system selects top 50 by score (confidence × mentions)
- **AND** system passes only selected 50 to LLM merge

#### Scenario: Limit new observations to 20
- **WHEN** session analysis produces 30 new observations
- **THEN** system selects top 20 by confidence
- **AND** system discards bottom 10 immediately

#### Scenario: Log token usage per merge
- **WHEN** merge completes successfully
- **THEN** system logs input tokens, output tokens, and estimated cost
- **AND** if cost > $0.05 per merge, system sends warning
