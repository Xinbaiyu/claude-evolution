# Capacity Control Specification

## ADDED Requirements

### Requirement: System maintains candidate pool within target size

The system SHALL keep active.json observations between minSize and maxSize, targeting configured size.

#### Scenario: Pool within target range
- **WHEN** active.json contains 48 observations
- **AND** config.learning.capacity = {targetSize: 50, maxSize: 60, minSize: 40}
- **THEN** system does NOT trigger capacity control
- **AND** all observations remain in pool

#### Scenario: Pool exceeds hard limit
- **WHEN** active.json contains 65 observations
- **AND** config.learning.capacity.maxSize = 60
- **THEN** system triggers capacity control
- **AND** system ranks observations by score = decayed confidence × mentions
- **AND** system retains top 50 (targetSize)
- **AND** system moves bottom 15 to archived.json

#### Scenario: Pool below soft limit
- **WHEN** active.json contains 35 observations
- **AND** config.learning.capacity.minSize = 40
- **THEN** system does NOT delete any observations
- **AND** system waits for new observations to fill pool

---

### Requirement: System scores observations for priority ranking

The system SHALL calculate score = decayedConfidence × mentions for each observation.

#### Scenario: High confidence, high mentions
- **WHEN** observation has decayed confidence = 0.85, mentions = 12
- **THEN** score = 0.85 × 12 = 10.2

#### Scenario: Medium confidence, low mentions
- **WHEN** observation has decayed confidence = 0.70, mentions = 3
- **THEN** score = 0.70 × 3 = 2.1

#### Scenario: Low confidence, high mentions
- **WHEN** observation has decayed confidence = 0.40, mentions = 8
- **THEN** score = 0.40 × 8 = 3.2

#### Scenario: Sort by score descending
- **WHEN** observations have scores [10.2, 2.1, 3.2, 8.5]
- **THEN** sorted order = [10.2, 8.5, 3.2, 2.1]
- **AND** system retains top N from sorted list

---

### Requirement: System archives pruned observations for recovery

The system SHALL move pruned observations to archived.json with 30-day retention.

#### Scenario: Archive pruned observations
- **WHEN** system prunes 15 observations from active.json
- **THEN** system appends observations to memory/observations/archived.json
- **AND** system adds archiveTimestamp = current time
- **AND** system adds archiveReason = "capacity_control"

#### Scenario: Prune old archived observations
- **WHEN** archived.json contains observations older than 30 days
- **THEN** system deletes observations where (now - archiveTimestamp) > 30 days
- **AND** system logs: "Deleted {count} expired archived observations"

#### Scenario: User recovers archived observation
- **WHEN** user clicks "Restore" on archived observation
- **THEN** system moves observation back to active.json
- **AND** system removes from archived.json
- **AND** system resets archiveTimestamp

---

### Requirement: System respects manual overrides during capacity control

The system SHALL NOT prune observations with manualOverride set.

#### Scenario: Protected observation survives pruning
- **WHEN** observation has low score = 1.5
- **AND** observation has manualOverride = {action: "ignore"}
- **AND** system triggers capacity control
- **THEN** system skips this observation during pruning
- **AND** observation remains in active.json even if below top N

#### Scenario: Count protected observations
- **WHEN** 5 observations have manualOverride
- **AND** capacity control needs to prune 10 observations
- **THEN** system prunes only from unprot ected observations
- **AND** final pool size may exceed targetSize if too many protected

---

### Requirement: System logs capacity control actions

The system SHALL log pruning decisions for audit and debugging.

#### Scenario: Log pruning event
- **WHEN** system prunes 12 observations
- **THEN** system logs:
  - "Capacity control: pruned 12 observations"
  - Pruned observation IDs
  - Score range of pruned items
  - Timestamp

#### Scenario: Log protected observations
- **WHEN** 3 observations skipped due to manualOverride
- **THEN** system logs:
  - "Capacity control: protected 3 observations"
  - Protected observation IDs and reasons

---

### Requirement: System prevents excessive pruning

The system SHALL NOT prune more than 30% of pool in single cycle.

#### Scenario: Limit pruning to 30%
- **WHEN** active.json contains 100 observations
- **AND** config.learning.capacity.targetSize = 50
- **THEN** system calculates max prune = 100 × 0.30 = 30
- **AND** system prunes 30 observations (not 50)
- **AND** resulting pool size = 70 (above target, but within safety limit)

#### Scenario: Gradual pruning over multiple cycles
- **WHEN** pool remains at 70 after first cycle
- **AND** next cycle triggers capacity control
- **THEN** system prunes another 21 (30% of 70)
- **AND** resulting pool size = 49 (within target)

---

### Requirement: System allows configurable capacity limits

The system SHALL read capacity config and validate ranges.

#### Scenario: User configures larger pool
- **WHEN** user sets config.learning.capacity.targetSize = 100
- **AND** config.learning.capacity.maxSize = 120
- **THEN** system maintains pool around 100 observations

#### Scenario: User configures smaller pool
- **WHEN** user sets config.learning.capacity.targetSize = 20
- **THEN** system prunes more aggressively
- **AND** only top 20 observations retained

#### Scenario: Invalid capacity configuration
- **WHEN** user sets config.learning.capacity.maxSize = 10
- **AND** config.learning.capacity.targetSize = 50
- **THEN** system rejects with error: "maxSize must be >= targetSize"

---

### Requirement: System displays capacity status in UI

The system SHALL show current pool size and capacity limits in WebUI.

#### Scenario: Display capacity gauge
- **WHEN** user views Settings > Learning tab
- **THEN** system displays:
  - Current pool size: 48
  - Target size: 50
  - Max size: 60
  - Progress bar: 48/60 (80%)
  - Status: "Healthy"

#### Scenario: Warning for near-capacity
- **WHEN** pool size = 58 (97% of maxSize)
- **THEN** system displays warning:
  - "Pool near capacity (58/60)"
  - "Next cycle will trigger pruning"

---

### Requirement: System handles edge cases in capacity control

The system SHALL handle empty pools and single-observation pools safely.

#### Scenario: Empty pool
- **WHEN** active.json is empty or missing
- **THEN** system skips capacity control
- **AND** system logs: "Pool empty, skipping capacity control"

#### Scenario: Single observation
- **WHEN** active.json contains 1 observation
- **THEN** system does NOT prune
- **AND** observation retained regardless of score

#### Scenario: All observations protected
- **WHEN** all observations have manualOverride
- **AND** pool exceeds maxSize
- **THEN** system logs warning: "Unable to prune - all observations protected"
- **AND** system allows pool to exceed maxSize temporarily
