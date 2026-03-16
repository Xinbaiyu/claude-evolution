## Context

The claude-evolution system manages observations across three pools:
- **Active Pool**: Newly discovered observations from session analysis, subject to LLM merge, temporal decay, and deletion based on confidence thresholds
- **Context Pool**: High-quality observations promoted (manually or automatically) to inform CLAUDE.md, currently without capacity limits
- **Archive Pool**: Removed observations (deleted/ignored/expired) kept for 30 days before permanent deletion

**Current State:**
- LLM merge (`src/learners/llm-merge.ts`) consolidates similar observations but doesn't check if merged observations match previously ignored items
- Archive Pool is write-only - users cannot restore observations they later realize are valuable
- Context Pool grows unbounded, risking performance degradation and overwhelming CLAUDE.md with stale observations
- Active Pool has mature capacity control (`src/memory/capacity-control.ts`) using `score = decayed_confidence × mentions`

**Constraints:**
- Must maintain backward compatibility with existing observation JSON files
- Cannot break Web UI real-time updates via WebSocket
- Learning cycle performance budget: +500ms max for new capacity control step
- Must preserve user manual overrides (promote/ignore/delete) through all operations

**Stakeholders:**
- Users: Need reliable ignore behavior and ability to recover mistakes
- System: Must prevent unbounded Context Pool growth
- CLAUDE.md: Needs focused, relevant observations (not historical noise)

## Goals / Non-Goals

**Goals:**
- Respect user ignore decisions during LLM merge operations
- Provide Archive Pool restoration UI and API
- Enforce Context Pool capacity limits using temporal decay
- Allow users to pin critical observations from automatic removal
- Make Context Pool capacity configurable through Settings UI

**Non-Goals:**
- Changing Active Pool capacity behavior (already works well)
- Adding usage frequency tracking for observations (future enhancement)
- Implementing semantic relevance decay (complex, deferred)
- Archive Pool UI showing deleted code/files (out of scope)
- Automated "unignore suggestions" based on new evidence (v2 feature)

## Decisions

### Decision 1: LLM Merge Ignore Protection Strategy

**Chosen Approach:** Inherit ignore state when similarity > 0.8 threshold

**Rationale:**
- Preserves user intent: If user explicitly ignored "Use bun instead of npm", merging a new "Prefer bun package manager" observation should respect that decision
- Uses existing similarity detection: `checkSimilarityToDeletedObservations()` already scans archived observations
- Low false positive rate: 0.8 threshold (same as existing deleted observation check) balances protection vs. allowing genuinely new observations

**Alternatives Considered:**
- **Warn user but don't auto-ignore:** Adds UI complexity and interrupt friction. Users who ignored once likely want it ignored again.
- **Complete skip (don't merge):** Loses valuable metadata consolidation. Better to merge but inherit ignore state.
- **Lower threshold (0.6):** Too aggressive - would block legitimately different observations.

**Implementation:**
```typescript
// In mergeLLM() after Stage 1 merge
const ignoredObs = archivedObs.filter(o => o.manualOverride?.action === 'ignore');

for (const merged of mergedObservations) {
  const similar = findMostSimilar(merged, ignoredObs);
  if (similar && similarity > 0.8) {
    merged.manualOverride = {
      action: 'ignore',
      timestamp: new Date().toISOString(),
      inheritedFrom: similar.id,
    };
    merged.mergeInfo = {
      mergedFromIgnored: true,
      originalIgnoredId: similar.id,
    };
    // Auto-archive
    toArchive.push(merged);
  }
}
```

### Decision 2: Archive Pool Restoration Behavior

**Chosen Approach:** Allow restoration to both Active and Context pools with user choice

**Rationale:**
- **Flexibility**: User might want to re-evaluate (Active) or immediately use (Context)
- **Maintains pool semantics**: Active = "needs review", Context = "confirmed useful"
- **Preserves manual override history**: Restoration sets `manualOverride.action = 'restore'` for audit trail

**Alternatives Considered:**
- **Always restore to Active:** Forces re-promotion workflow. Too rigid - wastes user time if observation is known-good.
- **Smart routing based on archive reason:** Complex logic, unclear to users where restoration goes.

**API Design:**
```typescript
POST /api/learning/unignore
{
  id: string,
  targetPool: 'active' | 'context'
}

POST /api/learning/batch/unignore
{
  ids: string[],
  targetPool: 'active' | 'context'
}
```

**UI Flow:**
```
Archive Pool → [Select observations] → [Restore to Active | Restore to Context]
```

### Decision 3: Context Pool Capacity Enforcement

**Chosen Approach:** Reuse Active Pool capacity logic with longer half-life and pinning protection

**Rationale:**
- **Code reuse**: `calculateScore(obs, halfLife)` and sorting logic already proven in Active Pool
- **Longer half-life (90 days default)**: Context Pool observations are high-quality, should decay slower than Active (30 days)
- **Absolute pinning protection**: Pinned observations excluded from capacity calculations entirely

**Alternatives Considered:**
- **No decay, pure LRU:** Simpler but ignores quality signals (confidence, mentions). Low-quality old observations could outlive high-quality recent ones.
- **Decay immunity for pinned items:** Still competes for capacity. Defeats purpose of pinning critical observations.
- **Usage-based scoring:** Requires tracking CLAUDE.md references in sessions. Too complex for v1.

**Capacity Formula:**
```typescript
// Unpinned observations only
score = confidence × 0.5^(age_days / halfLifeDays) × mentions

// Sort descending, keep top (maxSize - pinnedCount)
// Archive lowest scoring observations with reason: 'context_capacity'
```

**Configuration Defaults:**
```json
{
  "learning": {
    "capacity": {
      "context": {
        "enabled": true,
        "targetSize": 50,
        "maxSize": 80,
        "halfLifeDays": 90
      }
    }
  }
}
```

### Decision 4: Pinning Semantics

**Chosen Approach:** Absolute protection with UI limits (soft cap of 20 pinned items)

**Rationale:**
- **User trust**: If user pins "Use TypeScript strict mode", they expect it to never be removed
- **Prevents abuse**: UI warns at 20 pins, suggests reviewing existing pins. Doesn't hard-block but discourages over-pinning.
- **Simple implementation**: `if (obs.pinned) continue;` before capacity scoring

**Alternatives Considered:**
- **Priority boost (+0.5 score):** Still vulnerable to removal if Context Pool is full of high-scoring observations. Breaks user expectations.
- **Hard limit (max 10 pins):** Too restrictive for power users with large projects.

**UI Behavior:**
```
Pin button:
- Available in Context Pool observation cards
- Visual indicator: 📌 icon + "Pinned" badge + moves to top of list
- Batch pin: Select multiple → Pin Selected (warns if >20 total)

Unpin:
- Click 📌 to toggle off
- Batch unpin available
```

### Decision 5: Archive Reason Granularity

**Chosen Approach:** Distinguish `active_capacity` vs `context_capacity`

**Rationale:**
- **User clarity**: Archive Pool filters can show "From Active Pool" vs "From Context Pool"
- **Restoration UX**: Default restoration target can match source pool
- **Future analytics**: Track which pool produces more noise
- **Low cost**: Just a string constant change

**Alternatives Considered:**
- **Generic `capacity_control`:** Ambiguous origin. Would need additional `sourcePool` field anyway.

**Type Update:**
```typescript
type ArchiveReason =
  | 'user_deleted'
  | 'user_ignored'
  | 'expired'
  | 'active_capacity'   // NEW
  | 'context_capacity'; // NEW
```

## Risks / Trade-offs

### Risk 1: False Positives in Ignore Inheritance
**Description:** LLM merge might incorrectly flag a new observation as similar to an ignored one

**Mitigation:**
- Use battle-tested 0.8 similarity threshold (same as deleted observation check)
- Log all inheritance decisions with observation IDs and similarity scores for debugging
- Users can always restore from Archive Pool if they disagree

**Trade-off:** Accepting occasional false positives for stronger protection of user intent

### Risk 2: Context Pool Capacity Enforcement Performance
**Description:** Scoring all observations on every learning cycle could slow down analysis

**Mitigation:**
- Early exit if `observationCount <= maxSize` (common case)
- Capacity check runs after auto-promotion (once per cycle, not per observation)
- Pinned observations excluded from scoring entirely (O(n) → O(n - pinned))
- Target: <500ms overhead even with 150 observations

**Trade-off:** Accepting minor performance cost for bounded Context Pool growth

### Risk 3: Pinning Abuse
**Description:** Users might pin everything, defeating capacity management

**Mitigation:**
- UI warns at 20 pins: "You have 20 pinned observations. Consider reviewing older pins."
- Visual feedback: Pinned observations marked clearly, easy to audit
- No hard limit - trust users to self-regulate after warning

**Trade-off:** Soft limits prioritize user agency over strict enforcement

### Risk 4: Backward Compatibility with Existing Observations
**Description:** Observations without `pinned`, `mergeInfo` fields might break type checks

**Mitigation:**
- All new fields are optional (`pinned?: boolean`)
- Default handling: `if (!obs.pinned)` treats undefined as false
- TypeScript type guards ensure safe access: `obs.mergeInfo?.mergedFromIgnored`

**Trade-off:** None - optional fields maintain full backward compatibility

### Risk 5: Archive Pool UI Complexity
**Description:** Users might not understand restoration vs. unignore terminology

**Mitigation:**
- Clear button labels: "Restore to Active" and "Restore to Context" (not "Unignore")
- Filters: "Ignored by me", "Auto-archived (capacity)", "Expired"
- Tooltips explain each archive reason

**Trade-off:** Accepting slight UI complexity for powerful restoration workflow

## Migration Plan

**Deployment Steps:**

1. **Phase 1: Backend (Non-breaking)**
   - Deploy type extensions (`ObservationWithMetadata`, `ContextCapacityConfig`)
   - Deploy capacity control functions (disabled by default)
   - Deploy API endpoints (`/unignore`, `/pin`)
   - Verify with unit tests

2. **Phase 2: Enable Context Capacity (Opt-in)**
   - Add config section to `~/.claude-evolution/config.json`
   - Set `enabled: false` by default
   - Document in CHANGELOG: "Context Pool capacity now configurable (opt-in)"

3. **Phase 3: Frontend**
   - Deploy Archive Pool UI
   - Deploy Settings UI for capacity config
   - Deploy pin buttons in Context Pool
   - WebSocket updates work without changes (existing infrastructure)

4. **Phase 4: Enable by Default (1 week later)**
   - Change default `enabled: true` for new installations
   - Existing users must opt-in via Settings UI

**Rollback Strategy:**
- Disable capacity control: Set `learning.capacity.context.enabled = false`
- Observations with new fields are backward-compatible (optional fields)
- Archive Pool UI degradation: Falls back to read-only view if API unavailable
- No data migration needed - system handles missing fields gracefully

**Testing:**
- Unit tests: Capacity enforcement with pinned observations
- Integration tests: Unignore API → Context Pool → CLAUDE.md regeneration
- Manual tests: Pin 25 observations, verify UI warning
- Performance test: 200 Context Pool observations, measure capacity check latency

## Open Questions

**Q1: Should pinning be available in Active Pool?**
- Current scope: Context Pool only
- Rationale: Active Pool is transient (observations promoted or deleted quickly)
- Decision: Defer to user feedback. Easy to add later if needed.

**Q2: What happens if Context Pool capacity is disabled mid-session?**
- Behavior: Observations above maxSize remain until next enable
- No automatic expansion when disabled
- Decision: Acceptable. Settings change takes effect on next learning cycle.

**Q3: Should we track "last used in session" timestamp for observations?**
- Would enable usage-based decay (more accurate than time-based)
- Requires session analysis to log observation references
- Decision: Defer to Phase 2. Time-based decay is sufficient for v1.
