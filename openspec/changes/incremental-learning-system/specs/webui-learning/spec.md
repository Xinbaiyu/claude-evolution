# WebUI Learning Interface Specification

## ADDED Requirements

### Requirement: Settings page includes Learning configuration tab

The system SHALL add "Learning" tab to Settings page with capacity, decay, and threshold controls.

#### Scenario: Display Learning tab
- **WHEN** user navigates to Settings page
- **THEN** system displays tabs: [Scheduler, LLM, Notifications, Learning]
- **AND** user clicks "Learning" tab
- **AND** system displays learning configuration panel

#### Scenario: Configure candidate pool size
- **WHEN** user views Learning tab
- **THEN** system displays slider: "Candidate Pool Size"
  - Range: 10-200
  - Current value: 50
  - Labels: Min (10), Default (50), Max (200)
- **WHEN** user sets slider to 80
- **THEN** system updates config.learning.capacity.targetSize = 80
- **AND** system displays: "Will take effect on next analysis cycle"

#### Scenario: Configure half-life
- **WHEN** user views Learning tab
- **THEN** system displays slider: "Memory Half-Life (days)"
  - Range: 7-90
  - Current value: 30
  - Labels: Short (7), Default (30), Long (90)
- **WHEN** user sets slider to 45
- **THEN** system updates config.learning.decay.halfLifeDays = 45

#### Scenario: Toggle temporal decay
- **WHEN** user views Learning tab
- **THEN** system displays switch: "Enable Temporal Decay" (ON)
- **WHEN** user toggles switch to OFF
- **THEN** system updates config.learning.decay.enabled = false
- **AND** system displays warning: "Observations will not decay over time"

---

### Requirement: Settings page shows auto-promotion thresholds

The system SHALL allow users to configure gold and silver tier thresholds.

#### Scenario: Configure auto-promotion thresholds
- **WHEN** user views Learning tab > Auto-Promotion section
- **THEN** system displays:
  - Number input: "Auto-Promote Confidence (%)" = 90
  - Number input: "Auto-Promote Mentions" = 10
  - Number input: "High-Priority Confidence (%)" = 75
  - Number input: "High-Priority Mentions" = 5

#### Scenario: Update promotion thresholds
- **WHEN** user sets "Auto-Promote Confidence" = 85
- **AND** user sets "Auto-Promote Mentions" = 8
- **THEN** system validates 0 <= confidence <= 100
- **AND** system validates mentions >= 1
- **AND** system updates config.learning.promotion thresholds
- **AND** system displays success message

#### Scenario: Invalid threshold values
- **WHEN** user sets "Auto-Promote Confidence" = 120
- **THEN** system displays error: "Confidence must be between 0-100"
- **AND** system does NOT save invalid value

---

### Requirement: Settings page shows deletion thresholds

The system SHALL allow users to configure immediate and delayed deletion thresholds.

#### Scenario: Configure deletion thresholds
- **WHEN** user views Learning tab > Deletion section
- **THEN** system displays:
  - Number input: "Immediate Delete Below (%)" = 25
  - Number input: "Delayed Delete Below (%)" = 35
  - Number input: "Delayed Delete After (days)" = 14

#### Scenario: Update deletion thresholds
- **WHEN** user sets "Immediate Delete Below" = 20
- **THEN** system updates config.learning.deletion.immediateThreshold = 0.20
- **AND** system displays: "More aggressive deletion"

---

### Requirement: Settings page shows current pool status

The system SHALL display real-time candidate pool statistics.

#### Scenario: Display pool statistics
- **WHEN** user views Learning tab > Status section
- **THEN** system displays:
  - Current pool size: 48 observations
  - Gold tier: 3 observations (ready for auto-promotion)
  - Silver tier: 12 observations (high-priority review)
  - Bronze tier: 33 observations (candidate)
  - Progress bar: 48/50 (96% of target)

#### Scenario: Display last merge timestamp
- **WHEN** last merge completed at "2026-03-14 14:30"
- **THEN** system displays: "Last Merge: 2 hours ago"

---

### Requirement: Review page groups observations by tier

The system SHALL display observations in collapsible sections: Gold, Silver, Bronze.

#### Scenario: Display grouped observations
- **WHEN** user navigates to Review page
- **THEN** system displays sections:
  - 🥇 Gold Tier (3 observations) - Recommended for bulk approval
  - 🥈 Silver Tier (12 observations) - High priority
  - 🥉 Bronze Tier (33 observations) - Candidate pool

#### Scenario: Expand gold tier section
- **WHEN** user clicks "🥇 Gold Tier (3 observations)"
- **THEN** system expands section showing:
  - Observation 1: "Prefer async/await" (92%, 12 mentions, last seen: 6h ago)
  - Observation 2: "Unit tests required" (91%, 15 mentions, last seen: 12h ago)
  - Observation 3: "Use Zod validation" (90%, 10 mentions, last seen: 1d ago)

#### Scenario: Bulk approve gold tier
- **WHEN** user clicks "Approve All Gold" button
- **THEN** system displays confirmation: "Approve 3 observations?"
- **WHEN** user confirms
- **THEN** system promotes all 3 to context.json
- **AND** system regenerates CLAUDE.md
- **AND** system displays success: "3 rules added to CLAUDE.md"

---

### Requirement: Review page shows decay-adjusted confidence

The system SHALL display both original and decayed confidence in observation details.

#### Scenario: Display confidence with decay
- **WHEN** user views observation details
- **THEN** system displays:
  - Original Confidence: 85%
  - Current Confidence: 72% (decayed 15% over 45 days)
  - Mentions: 7
  - Last Seen: 3 days ago

#### Scenario: Highlight decay impact
- **WHEN** observation has decayed > 20%
- **THEN** system displays warning icon with tooltip:
  - "Confidence decayed from 92% to 65% over 60 days"
  - "Consider promoting or deleting this observation"

---

### Requirement: Review page supports manual promotion actions

The system SHALL allow users to manually promote, demote, or ignore observations.

#### Scenario: Manually promote observation
- **WHEN** user clicks "Promote" on observation with confidence = 70%, mentions = 4
- **THEN** system displays dialog: "Force promote to active rules?"
- **WHEN** user confirms
- **THEN** system sets manualOverride = {action: "promote", timestamp: now}
- **AND** system sets confidence = 95%, mentions = 20 (forced values)
- **AND** system moves to context.json
- **AND** system regenerates CLAUDE.md

#### Scenario: Manually ignore observation
- **WHEN** user clicks "Ignore" on observation
- **THEN** system sets manualOverride = {action: "ignore", timestamp: now}
- **AND** observation remains in active.json
- **AND** observation protected from automatic deletion

#### Scenario: Delete observation
- **WHEN** user clicks "Delete" on observation
- **THEN** system displays confirmation: "Permanently delete?"
- **WHEN** user confirms
- **THEN** system removes observation from active.json
- **AND** system does NOT archive (user-initiated delete)

---

### Requirement: Review page shows evidence and provenance

The system SHALL display evidence sessions and merge history for each observation.

#### Scenario: Display evidence list
- **WHEN** user expands observation details
- **THEN** system displays:
  - Evidence (5 sessions):
    - Session 2026-03-10: "used async/await in API handler"
    - Session 2026-03-08: "refactored callbacks to async"
    - ... (show top 3, collapse rest)

#### Scenario: Display merge history
- **WHEN** observation was merged from 3 original observations
- **THEN** system displays:
  - Merged From:
    - obs-123: "prefer async over callbacks" (85%, 5 mentions)
    - obs-456: "use async/await syntax" (90%, 3 mentions)
    - obs-789: "async recommended in docs" (88%, 4 mentions)

---

### Requirement: Review page supports filtering and search

The system SHALL allow users to filter observations by type, tier, and search text.

#### Scenario: Filter by type
- **WHEN** user selects filter: "Type = Preference"
- **THEN** system displays only preference observations
- **AND** system hides patterns and workflows

#### Scenario: Filter by tier
- **WHEN** user selects filter: "Tier = Gold"
- **THEN** system displays only gold tier observations

#### Scenario: Search observations
- **WHEN** user types "async" in search box
- **THEN** system filters observations matching "async" in:
  - Preference description
  - Pattern problem/solution
  - Workflow name/steps

---

### Requirement: Review page shows archived observations

The system SHALL add "Archived" tab to display pruned observations with restore option.

#### Scenario: View archived observations
- **WHEN** user clicks "Archived" tab
- **THEN** system displays observations in archived.json
- **AND** each observation shows:
  - Archive timestamp
  - Archive reason (capacity_control | expired | user_deleted)
  - Time until permanent deletion (e.g., "Expires in 23 days")

#### Scenario: Restore archived observation
- **WHEN** user clicks "Restore" on archived observation
- **THEN** system moves observation back to active.json
- **AND** system removes from archived.json
- **AND** system displays success: "Observation restored to candidate pool"

#### Scenario: Permanently delete archived observation
- **WHEN** user clicks "Delete Forever" on archived observation
- **THEN** system displays confirmation: "Cannot be undone"
- **WHEN** user confirms
- **THEN** system removes observation from archived.json permanently
