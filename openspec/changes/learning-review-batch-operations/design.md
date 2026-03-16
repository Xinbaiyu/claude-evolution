## Context

The Learning Review page (`/learning-review`) is the central hub for managing 182+ active observations across three pools (active, context, archived). Currently, users must perform actions one observation at a time, which is inefficient for bulk management tasks like clearing test noise or migrating between tech stacks.

**Critical Bug**: The DELETE endpoint (POST `/api/learning/delete`) directly removes observations from active/context pools without archiving them, causing data loss. When similar observations reappear in future analyses, users experience "déjà vu" - they've deleted this before, but the system has no memory of it.

**Current Architecture**:
- Frontend: React state management in `LearningReview.tsx` with individual operation handlers
- Backend: RESTful endpoints in `learning.ts` for single-observation operations
- Merge: `llm-merge.ts` only checks active pool for duplicates, ignoring archived observations

**Stakeholders**: All claude-evolution users managing observation pools, especially those with high observation volumes.

## Goals / Non-Goals

**Goals:**
- Enable efficient bulk management of observations (select multiple → perform action once)
- Fix data loss bug by implementing proper archival workflow
- Prevent "zombie observations" by making LLM merge aware of deletion history
- Maintain backward compatibility for existing single-operation workflows
- Provide clear user feedback during batch operations (progress, errors)

**Non-Goals:**
- Advanced filtering/search improvements (out of scope - focus on selection & operations)
- Undo/redo functionality for batch operations (future enhancement)
- Observation editing or merging UI (separate feature)
- Settings page for deletion behavior configuration (Phase 3 - not included here)

## Decisions

### Decision 1: Frontend Selection State Management

**Choice**: Use React `useState` with `Set<string>` for selected observation IDs.

**Rationale**:
- `Set` provides O(1) lookup for "is selected?" checks
- Immutable update pattern: `new Set(prevSet)` triggers re-renders
- No external state library needed (Redux overkill for local UI state)

**Alternatives Considered**:
- Array of IDs: O(n) lookup, slower for large selections
- Object/Record: Works but Set is more semantically correct

**Implementation**:
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

### Decision 2: Batch Operation API Design

**Choice**: Single endpoint per operation with array of IDs in request body.

**API Design**:
```
POST /api/learning/batch/promote
Body: { ids: string[] }

POST /api/learning/batch/ignore
Body: { ids: string[], reason?: string }

POST /api/learning/batch/delete
Body: { ids: string[] }
```

**Rationale**:
- RESTful pattern consistent with existing single-operation endpoints
- Allows atomic transactions (all succeed or all fail)
- Easy to implement with Promise.all() for parallel execution

**Alternatives Considered**:
- Single `/api/learning/batch` with `action` param: Less RESTful, harder to type
- WebSocket streaming: Overkill for current scale, adds complexity

### Decision 3: Archival Bug Fix Strategy

**Choice**: Update DELETE endpoint to move observations to archived pool with metadata.

**New Flow**:
```
1. Load observation from active/context pool
2. Add archive metadata:
   - archiveReason: 'user_deleted'
   - archiveTimestamp: ISO 8601 string
   - suppressSimilar: true
3. Save to archived pool
4. Remove from source pool
5. Emit WebSocket event
```

**Rationale**:
- Preserves data for 30 days (configurable retention policy)
- Enables future "restore" functionality
- Maintains audit trail (who deleted what when)

**Migration**: No data migration needed - bug fix only affects future deletions.

### Decision 4: Deletion Awareness in LLM Merge

**Choice**: Phase 2 approach - add `similarToDeleted` warning flag to new observations.

**Flow**:
```
1. llm-merge loads active + archived (user_deleted only)
2. For each new observation:
   a. Compare with archived observations (similarity > 80%)
   b. If similar, add warning metadata:
      {
        similarToDeleted: {
          deletedId: string,
          deletedAt: string,
          similarity: number
        }
      }
3. Save to active pool
4. Frontend displays warning badge
```

**Rationale**:
- Non-blocking: Doesn't prevent observation creation
- User agency: Users decide whether to delete again or keep
- No false positives affecting workflow
- Avoids complex "suppression list" logic

**Alternatives Considered**:
- Auto-block similar observations: Too aggressive, false positives
- Do nothing: Users annoyed by recurring observations

### Decision 5: UI/UX for Batch Operations

**Choice**: Persistent batch action bar when items selected, inspired by Gmail.

**Design**:
```
┌───────────────────────────────────────┐
│ ✓ 23 selected                         │
│ [ Promote ] [ Ignore ] [ Delete ]     │
└───────────────────────────────────────┘
```

**Interaction**:
- Appears above observation list when selection count > 0
- Shows selected count
- Batch buttons trigger confirmation dialogs
- Progress toast during execution

**Rationale**:
- Familiar pattern (Gmail, Google Drive, etc.)
- Always visible - users don't lose context
- Clear call-to-action

## Risks / Trade-offs

### Risk 1: Batch Operations Performance

**Risk**: Batch promoting 100+ observations could timeout or slow down UI.

**Mitigation**:
- Limit batch size to 50 observations per request
- Frontend chunking: Split large selections into multiple API calls
- Show progress indicator: "Processing 23/100..."
- Use Promise.all() for parallel execution within each chunk

### Risk 2: Selection State Lost on Filter Change

**Risk**: User selects 20 observations, changes filter, selections disappear.

**Mitigation**:
- Preserve selection state in React state (IDs persist even if filtered out)
- Show "X selected (Y hidden by filter)" message
- Add "Clear selection" button for explicit reset

### Risk 3: Race Condition in Batch Delete + Archive

**Risk**: Concurrent delete + restore operations could corrupt data.

**Mitigation**:
- No locking needed initially (single-user system)
- Future: Add optimistic concurrency control with version numbers

### Risk 4: False Positive Similarity Warnings

**Risk**: Unrelated observations flagged as "similar to deleted" (e.g., two different "prefer TypeScript" observations).

**Mitigation**:
- Set high similarity threshold (80%+)
- Provide "Ignore warning" action
- Log false positive rate for tuning

### Risk 5: Breaking Change Impact

**Risk**: Existing automation scripts expect permanent deletion.

**Mitigation**:
- Document breaking change in CHANGELOG
- Archived observations auto-delete after 30 days (eventual consistency)
- Provide migration guide if needed

## Migration Plan

**Phase 1: Fix Archival Bug** (Days 1-2)
1. Deploy backend fix for DELETE endpoint
2. Verify archived.json receives deleted observations
3. Test restore functionality

**Phase 2: Add Batch Operations** (Days 3-5)
1. Deploy backend batch endpoints
2. Deploy frontend selection UI
3. Test with 10, 50, 100+ observation selections

**Phase 3: Deletion Awareness** (Days 6-7)
1. Deploy LLM merge enhancement
2. Deploy warning badge UI
3. Monitor false positive rate

**Rollback Strategy**:
- Backend: Revert DELETE endpoint to old behavior (preserve old function)
- Frontend: Feature flag for batch operations (disabled by default)
- Data: No data loss risk - archived.json append-only

**Success Metrics**:
- Zero data loss incidents (DELETE moves to archive)
- 80%+ reduction in repeated deletion of similar observations
- Batch operations complete within 10 seconds for 50 observations

## Open Questions

1. **Batch operation size limits**: Should we enforce a hard limit (e.g., 100 max)? Or just show warning?
   - Proposal: Soft limit of 50 with warning, hard limit of 200

2. **Selection persistence**: Should selection survive page refresh?
   - Proposal: No (session state only), avoid localStorage complexity

3. **Similarity threshold**: 80% is arbitrary - should we make it configurable?
   - Proposal: Hardcode 80% initially, add setting in future if needed

4. **Archived pool UI**: Show similarity warnings in archived tab?
   - Proposal: Yes, display "Reappeared X times since deletion" counter
