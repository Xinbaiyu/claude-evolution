## Context

Currently, Web UI operations (promote, ignore, delete, restore) on observations modify the JSON files (`context.json`, `active.json`, `archived.json`) but do not trigger CLAUDE.md regeneration. The `regenerateClaudeMd()` function is only called during the complete learning cycle in `learning-orchestrator.ts`, causing CLAUDE.md to become stale until the next scheduled analysis run.

Additionally, the promote endpoint checks if an observation is already in context but doesn't handle the case where an observation has been marked as ignored. This prevents users from changing their decision and promoting a previously ignored observation.

**Current Architecture:**
```
Web UI Operation → Update JSON files → Return success
                     ↓
                     X (missing step)

Learning Cycle → Update JSON files → regenerateClaudeMd() ✓
```

**Constraints:**
- Must not block HTTP responses during CLAUDE.md generation
- Must handle errors gracefully (CLAUDE.md generation failure should not fail the API operation)
- Must maintain backwards compatibility with existing learning-orchestrator flow

## Goals / Non-Goals

**Goals:**
- Real-time CLAUDE.md synchronization after all context-modifying Web UI operations
- Allow users to promote observations that were previously ignored
- Maintain fast API response times
- Graceful error handling for CLAUDE.md generation failures

**Non-Goals:**
- Optimizing CLAUDE.md generation performance (already fast enough)
- Adding versioning or history tracking for CLAUDE.md
- Modifying the learning-orchestrator flow (it already works correctly)
- Adding UI notifications for CLAUDE.md updates (out of scope)

## Decisions

### Decision 1: Async CLAUDE.md Generation

**Chosen Approach:** Fire-and-forget async regeneration after saving context.json

**Rationale:**
- CLAUDE.md generation is fast (<100ms typically) but should not block API responses
- Errors in generation should not fail the user's operation
- Simplest implementation with minimal code changes

**Alternatives Considered:**
- **Synchronous generation:** Rejected - blocks API response
- **Queue-based generation:** Over-engineered for this use case
- **Debounced batch generation:** Adds complexity without clear benefit

**Implementation:**
```typescript
// After saveContextObservations()
regenerateClaudeMd(updatedContext).catch(err => {
  logger.error('Failed to regenerate CLAUDE.md:', err);
});
// Continue without awaiting
```

### Decision 2: Where to Call regenerateClaudeMd()

**Chosen Approach:** Call after every operation that modifies context.json

**Affected Endpoints:**
1. `POST /api/learning/promote` (line ~143)
2. `POST /api/learning/ignore` (line ~289, only if modifying context pool)
3. `POST /api/learning/delete` (line ~370, only if deleting from context)
4. `POST /api/learning/restore` (line ~620, only if restoring to context)
5. `POST /api/learning/batch/promote` (after batch completes)
6. `POST /api/learning/batch/ignore` (after batch completes, if context modified)
7. `POST /api/learning/batch/delete` (after batch completes, if context modified)

**Rationale:**
- Simple rule: "modify context.json → regenerate CLAUDE.md"
- No need for complex change detection logic
- Idempotent operation (safe to call multiple times)

### Decision 3: Handling Ignore → Promote Transition

**Chosen Approach:** Promote operation automatically overwrites manualOverride

**Implementation:**
```typescript
// Current code already does this correctly at line 123-132
const updatedObs: ObservationWithMetadata = {
  ...observation,
  inContext: true,
  manualOverride: {
    action: 'promote',  // This overwrites previous 'ignore'
    timestamp: new Date().toISOString(),
  },
  // ...
};
```

**Additional Change:** Add logging when overwriting ignore flag
```typescript
if (observation.manualOverride?.action === 'ignore') {
  logger.info(`Observation ${id} was previously ignored, now promoting`);
}
```

**Rationale:**
- No logic change needed - current code already overwrites manualOverride
- Only missing piece is user visibility (logging)
- Simple and predictable behavior for users

## Risks / Trade-offs

### Risk 1: CLAUDE.md Generation Failures
**Description:** If `regenerateClaudeMd()` throws an error, users won't be notified

**Mitigation:**
- Use try-catch with logging
- Fire-and-forget pattern ensures API operation succeeds regardless
- Users can manually trigger regeneration via CLI if needed

**Trade-off:** Accepting eventual consistency for better reliability

### Risk 2: Race Conditions
**Description:** Multiple rapid operations could trigger overlapping CLAUDE.md generations

**Mitigation:**
- Not a problem in practice - file writes are atomic
- Last write wins (correct behavior)
- File system handles concurrent writes safely

**Trade-off:** Accepting potential wasted work for simpler implementation

### Risk 3: Performance Impact on Batch Operations
**Description:** Batch operations might trigger multiple regenerations

**Mitigation:**
- Check implementation - batch operations update context.json once at the end
- Single regeneration call per batch operation
- No performance concern

## Migration Plan

**Deployment Steps:**
1. Deploy updated backend code (no DB changes)
2. No frontend changes needed
3. No configuration changes needed

**Rollback Strategy:**
- Simple code revert if issues arise
- No data migration needed
- Backwards compatible

**Testing:**
1. Unit test: Verify regenerateClaudeMd() is called after context modifications
2. Integration test: Verify CLAUDE.md content matches context.json after operations
3. Manual test: Perform UI operations and check CLAUDE.md updates

## Open Questions

None - implementation path is clear.
