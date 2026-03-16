# Temporal Decay Specification

## ADDED Requirements

### Requirement: System applies exponential decay to observation confidence

The system SHALL calculate decayed confidence using the formula: `decayed = original × e^(-λ × age)` where `λ = ln(2) / halfLifeDays`.

#### Scenario: Calculate decay for 30-day old observation
- **WHEN** observation has originalConfidence = 0.90
- **AND** observation firstSeen = 30 days ago
- **AND** halfLifeDays = 30
- **THEN** system calculates λ = ln(2) / 30 ≈ 0.0231
- **AND** system calculates decayed = 0.90 × e^(-0.0231 × 30) ≈ 0.45 (50% of original)

#### Scenario: Calculate decay for recent observation
- **WHEN** observation has originalConfidence = 0.85
- **AND** observation firstSeen = 5 days ago
- **AND** halfLifeDays = 30
- **THEN** decayed confidence ≈ 0.76 (89% of original)

#### Scenario: Calculate decay for very old observation
- **WHEN** observation has originalConfidence = 0.95
- **AND** observation firstSeen = 90 days ago
- **AND** halfLifeDays = 30
- **THEN** decayed confidence ≈ 0.12 (12.5% of original)

---

### Requirement: System uses firstSeen timestamp for decay calculation

The system SHALL calculate age from firstSeen, not lastSeen, to measure absolute observation age.

#### Scenario: Age calculation from firstSeen
- **WHEN** observation has firstSeen = "2026-01-15T10:00:00Z"
- **AND** observation has lastSeen = "2026-03-10T15:30:00Z"
- **AND** current time = "2026-03-14T12:00:00Z"
- **THEN** system calculates age = 58 days (from firstSeen)
- **NOT** age = 4 days (from lastSeen)

---

### Requirement: System preserves originalConfidence for decay calculation

The system SHALL store originalConfidence separately and never overwrite it with decayed value.

#### Scenario: Preserve original confidence across multiple decays
- **WHEN** observation created with confidence = 0.90
- **THEN** system stores originalConfidence = 0.90
- **AND** after 30 days, decayed = 0.45
- **AND** originalConfidence still = 0.90
- **AND** after 60 days, decayed = 0.225 (calculated from original 0.90, not from 0.45)

#### Scenario: Update originalConfidence only on re-observation
- **WHEN** observation is re-observed in new session with confidence = 0.95
- **THEN** system updates originalConfidence = 0.95
- **AND** system updates lastSeen = current time
- **AND** mentions += 1

---

### Requirement: System allows configurable half-life

The system SHALL read halfLifeDays from config and allow values between 7-90 days.

#### Scenario: User configures 15-day half-life
- **WHEN** user sets config.learning.decay.halfLifeDays = 15
- **AND** observation is 15 days old with originalConfidence = 0.80
- **THEN** decayed confidence ≈ 0.40 (50% decay)

#### Scenario: User configures 60-day half-life
- **WHEN** user sets config.learning.decay.halfLifeDays = 60
- **AND** observation is 30 days old with originalConfidence = 0.80
- **THEN** decayed confidence ≈ 0.63 (slower decay than 30-day default)

#### Scenario: Reject invalid half-life values
- **WHEN** user sets config.learning.decay.halfLifeDays = 5
- **THEN** system rejects with error: "halfLifeDays must be between 7-90"

---

### Requirement: System supports disabling decay

The system SHALL allow users to disable temporal decay via configuration.

#### Scenario: Decay disabled via config
- **WHEN** config.learning.decay.enabled = false
- **THEN** system returns originalConfidence without decay calculation
- **AND** all observations retain full confidence regardless of age

#### Scenario: Decay enabled by default
- **WHEN** config.learning.decay.enabled is not set
- **THEN** system defaults to enabled = true

---

### Requirement: System applies decay before promotion checks

The system SHALL calculate decayed confidence before checking promotion thresholds.

#### Scenario: Decay prevents auto-promotion
- **WHEN** observation has originalConfidence = 0.92, mentions = 12
- **AND** observation is 45 days old (decayed to ~0.65)
- **AND** auto-promotion threshold = 0.90
- **THEN** decayed confidence (0.65) < threshold (0.90)
- **AND** observation is NOT auto-promoted

#### Scenario: Recent observation passes promotion
- **WHEN** observation has originalConfidence = 0.92, mentions = 12
- **AND** observation is 5 days old (decayed to ~0.82)
- **AND** auto-promotion threshold = 0.90
- **THEN** decayed confidence (0.82) still fails threshold
- **BUT** observation is in high-priority category

---

### Requirement: System applies decay before deletion checks

The system SHALL use decayed confidence for deletion threshold comparisons.

#### Scenario: Decay triggers immediate deletion
- **WHEN** observation has originalConfidence = 0.45
- **AND** observation is 60 days old (decayed to ~0.11)
- **AND** immediate deletion threshold = 0.25
- **THEN** decayed confidence (0.11) < threshold (0.25)
- **AND** system deletes observation

#### Scenario: Recent observation avoids deletion
- **WHEN** observation has originalConfidence = 0.35
- **AND** observation is 3 days old (decayed to ~0.33)
- **AND** immediate deletion threshold = 0.25
- **THEN** decayed confidence (0.33) > threshold (0.25)
- **AND** observation is retained

---

### Requirement: System logs decay calculations for audit

The system SHALL log original and decayed confidence for debugging.

#### Scenario: Debug log for decay calculation
- **WHEN** observation undergoes decay calculation
- **THEN** system logs:
  - Observation ID
  - originalConfidence
  - age in days
  - halfLifeDays
  - calculated decayed confidence
  - timestamp

#### Scenario: Warn on extreme decay
- **WHEN** decayed confidence drops below 10% of original
- **THEN** system logs warning: "Extreme decay detected for observation {id}"

---

### Requirement: System handles edge cases in decay calculation

The system SHALL handle zero age and missing timestamps safely.

#### Scenario: Zero age (same-day observation)
- **WHEN** observation firstSeen = current time
- **THEN** age = 0 days
- **AND** decayed confidence = originalConfidence (no decay)

#### Scenario: Missing firstSeen timestamp
- **WHEN** observation lacks firstSeen field
- **THEN** system defaults firstSeen = timestamp field (creation time)
- **AND** logs warning: "Missing firstSeen, using timestamp as fallback"

#### Scenario: Future firstSeen (clock skew)
- **WHEN** observation firstSeen is in the future
- **THEN** system treats age = 0 (no decay)
- **AND** logs warning: "Invalid firstSeen timestamp detected"
