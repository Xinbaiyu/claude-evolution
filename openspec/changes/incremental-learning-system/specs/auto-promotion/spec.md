# Auto-Promotion Specification

## ADDED Requirements

### Requirement: System auto-promotes observations meeting gold-tier thresholds

The system SHALL automatically move observations to context.json when decayed confidence ≥ 90% AND mentions ≥ 10.

#### Scenario: Qualify for auto-promotion
- **WHEN** observation has originalConfidence = 0.95, mentions = 12
- **AND** observation is 10 days old (decayed to ~0.84)
- **AND** auto-promotion threshold = {confidence: 0.90, mentions: 10}
- **THEN** system checks: 0.84 < 0.90 → does NOT qualify
- **WHEN** observation is 5 days old (decayed to ~0.89)
- **THEN** still does NOT qualify (0.89 < 0.90)
- **WHEN** observation originalConfidence increased to 1.00 (decayed to 0.94)
- **THEN** system qualifies observation for auto-promotion
- **AND** system moves observation to context.json
- **AND** system removes observation from active.json

#### Scenario: High confidence but low mentions
- **WHEN** observation has decayed confidence = 0.92, mentions = 3
- **THEN** system does NOT auto-promote (mentions < 10)
- **AND** observation remains in active.json

#### Scenario: High mentions but low confidence
- **WHEN** observation has decayed confidence = 0.75, mentions = 15
- **THEN** system does NOT auto-promote (confidence < 0.90)
- **AND** observation tagged as high-priority for manual review

---

### Requirement: System categorizes observations into three tiers

The system SHALL classify observations as gold (auto), silver (high-priority), or bronze (candidate).

#### Scenario: Gold tier classification
- **WHEN** decayed confidence ≥ 0.90 AND mentions ≥ 10
- **THEN** tier = "gold" (auto-promote)

#### Scenario: Silver tier classification
- **WHEN** decayed confidence ≥ 0.75 AND mentions ≥ 5
- **AND** does not meet gold tier
- **THEN** tier = "silver" (high-priority manual review)

#### Scenario: Bronze tier classification
- **WHEN** decayed confidence ≥ 0.60 AND mentions ≥ 3
- **AND** does not meet silver tier
- **THEN** tier = "bronze" (candidate, keep observing)

#### Scenario: Below candidate threshold
- **WHEN** decayed confidence < 0.60 OR mentions < 3
- **THEN** tier = "none" (subject to deletion rules)

---

### Requirement: System respects manual overrides for promotion

The system SHALL NOT auto-demote observations manually promoted by user.

#### Scenario: User manually promotes observation
- **WHEN** user clicks "Promote" on observation with confidence = 0.70, mentions = 4
- **THEN** system sets manualOverride = {action: "promote", timestamp: now}
- **AND** system sets originalConfidence = 0.95, mentions = 20 (forced values)
- **AND** system moves observation to context.json
- **AND** system marks inContext = true

#### Scenario: Manually promoted observation decays below threshold
- **WHEN** manually promoted observation ages 90 days (decayed to 0.12)
- **AND** manualOverride.action = "promote"
- **THEN** system does NOT auto-demote despite low confidence
- **AND** observation remains in context.json

#### Scenario: User manually demotes observation
- **WHEN** user clicks "Demote" on observation in context.json
- **THEN** system sets manualOverride = {action: "demote", timestamp: now}
- **AND** system moves observation back to active.json
- **AND** system marks inContext = false

---

### Requirement: System regenerates CLAUDE.md after promotions

The system SHALL rebuild CLAUDE.md from context.json after each promotion cycle.

#### Scenario: Promote 3 observations and regenerate
- **WHEN** 3 observations qualify for auto-promotion
- **THEN** system moves all 3 to context.json
- **AND** system reads all observations in context.json
- **AND** system groups by type (preferences, patterns, workflows)
- **AND** system generates markdown sections for each group
- **AND** system writes to ~/.claude-evolution/output/CLAUDE.md

#### Scenario: No promotions, skip regeneration
- **WHEN** no observations qualify for promotion
- **THEN** system skips CLAUDE.md regeneration
- **AND** system logs: "No promotions, CLAUDE.md unchanged"

---

### Requirement: System notifies user of auto-promotions

The system SHALL log and optionally notify user when observations are auto-promoted.

#### Scenario: Log auto-promotion
- **WHEN** observation "prefer async/await" is auto-promoted
- **THEN** system logs:
  - "Auto-promoted: prefer async/await (confidence: 0.92, mentions: 12)"
  - Timestamp
  - Tier: gold

#### Scenario: Batch notification for multiple promotions
- **WHEN** 5 observations are auto-promoted in single cycle
- **THEN** system sends notification:
  - "5 new rules auto-applied to CLAUDE.md"
  - Link to view promoted observations

---

### Requirement: System prevents duplicate promotions

The system SHALL NOT promote observations already in context.json.

#### Scenario: Check inContext flag before promotion
- **WHEN** observation has inContext = true
- **THEN** system skips promotion check
- **AND** observation remains in context.json (not moved to active.json)

#### Scenario: Observation exists in both files (data corruption)
- **WHEN** observation exists in both active.json and context.json
- **THEN** system logs error: "Duplicate observation detected"
- **AND** system removes from active.json (context.json is source of truth)

---

### Requirement: System allows configurable promotion thresholds

The system SHALL read promotion thresholds from config and validate ranges.

#### Scenario: User increases auto-promotion threshold
- **WHEN** user sets config.learning.promotion.autoConfidence = 0.95
- **AND** config.learning.promotion.autoMentions = 15
- **THEN** system requires both conditions for auto-promotion
- **AND** fewer observations qualify (stricter criteria)

#### Scenario: User lowers promotion threshold
- **WHEN** user sets config.learning.promotion.autoConfidence = 0.80
- **THEN** more observations qualify for auto-promotion

#### Scenario: Invalid threshold configuration
- **WHEN** user sets config.learning.promotion.autoConfidence = 1.5
- **THEN** system rejects with error: "confidence must be between 0-1"

---

### Requirement: System tracks promotion history

The system SHALL record when and why observations were promoted.

#### Scenario: Add promotion metadata
- **WHEN** observation is auto-promoted
- **THEN** system adds promotedAt = current timestamp
- **AND** system adds promotionReason = "auto" | "manual"
- **AND** system preserves manualOverride if exists

#### Scenario: Audit log for promotions
- **WHEN** user requests promotion history
- **THEN** system returns list of promotions with:
  - Observation ID and description
  - Promotion timestamp
  - Reason (auto vs manual)
  - Confidence and mentions at promotion time
