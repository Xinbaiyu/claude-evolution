## 1. Type System Extensions

- [x] 1.1 Extend `ObservationWithMetadata` type in `src/types/learning.ts` to add optional `pinned`, `pinnedBy`, `pinnedAt` fields
- [x] 1.2 Extend `ObservationWithMetadata` type to add optional `mergeInfo` object with `mergedFromIgnored` and `originalIgnoredId` fields
- [x] 1.3 Extend `manualOverride` type to add optional `inheritedFrom` field for tracking ignore state inheritance
- [x] 1.4 Update `ArchiveReason` type to include `'active_capacity'` and `'context_capacity'` as valid values
- [x] 1.5 Create `ContextCapacityConfig` interface with `enabled`, `targetSize`, `maxSize`, `halfLifeDays` fields
- [x] 1.6 Extend main `Config` type to include `learning.capacity.context: ContextCapacityConfig`

## 2. LLM Merge Ignore Protection

- [x] 2.1 Add `checkSimilarityToIgnoredObservations()` function in `src/learners/llm-merge.ts` to detect similarity to archived ignored observations
- [x] 2.2 Modify `mergeLLM()` to load archived observations with `manualOverride.action === 'ignore'` before merge
- [x] 2.3 After Stage 1 merge, call similarity check for each merged observation against ignored observations
- [x] 2.4 When similarity > 0.8, set merged observation's `manualOverride.action = 'ignore'` and populate `inheritedFrom` and `mergeInfo` fields
- [x] 2.5 Add inherited observations to `toArchive` array with `archiveReason = 'user_ignored'`
- [x] 2.6 Add logging for all ignore state inheritance events with observation IDs and similarity scores
- [ ] 2.7 Write unit tests for ignore inheritance with various similarity thresholds

## 3. Context Pool Capacity Control

- [x] 3.1 Create `enforceContextCapacity()` function in `src/memory/capacity-control.ts` based on existing `enforceCapacity()` pattern
- [x] 3.2 Implement pinned observation filtering in `enforceContextCapacity()` - exclude observations with `pinned = true` from scoring
- [x] 3.3 Use configurable `halfLifeDays` parameter (default 90) in score calculation for Context Pool
- [x] 3.4 Return pruned observations with `archiveReason = 'context_capacity'` instead of `'active_capacity'`
- [x] 3.5 Add `calculateContextCapacityStatistics()` function to return utilization metrics
- [ ] 3.6 Write unit tests for Context Pool capacity enforcement with various pinned observation scenarios
- [ ] 3.7 Write unit tests for capacity enforcement with empty Context Pool and maxSize not exceeded

## 4. Learning Cycle Integration

- [x] 4.1 Add Context Pool capacity control step in `src/memory/learning-orchestrator.ts` after auto-promotion
- [x] 4.2 Load Context Pool capacity config from `config.learning.capacity.context`
- [x] 4.3 Skip Context Pool capacity enforcement if `config.learning.capacity.context.enabled = false`
- [x] 4.4 Call `enforceContextCapacity()` with Context Pool observations and config
- [x] 4.5 Archive pruned observations and combine with existing archived observations
- [x] 4.6 Save updated Context Pool after capacity enforcement
- [x] 4.7 Add comprehensive logging for Context Pool capacity actions (original count, pinned count, pruned count, final count)
- [x] 4.8 Measure and log Context Pool capacity enforcement duration

## 5. Archive Pool Restoration API

- [ ] 5.1 Add `POST /api/learning/unignore` endpoint in `web/server/routes/learning.ts` for single observation restoration
- [ ] 5.2 Implement request validation for unignore endpoint (id required, targetPool must be 'active' or 'context')
- [ ] 5.3 Load observation from Archive Pool, validate existence, return 404 if not found
- [ ] 5.4 Remove observation from Archive Pool and add to target pool (Active or Context)
- [ ] 5.5 Clear `archiveTimestamp`, `archiveReason`, and `manualOverride` fields from restored observation
- [ ] 5.6 Trigger CLAUDE.md regeneration if targetPool is 'context'
- [ ] 5.7 Emit WebSocket event to notify UI of restoration
- [ ] 5.8 Add `POST /api/learning/batch/unignore` endpoint for batch restoration
- [ ] 5.9 Implement batch restoration logic with single CLAUDE.md regeneration at the end
- [ ] 5.10 Write integration tests for unignore API endpoints

## 6. Observation Pinning API

- [ ] 6.1 Add `POST /api/learning/pin` endpoint in `web/server/routes/learning.ts` for pinning observations
- [ ] 6.2 Validate observation exists in Context Pool, return 404 if not found
- [ ] 6.3 Set observation's `pinned = true`, `pinnedBy = 'user'`, `pinnedAt = <timestamp>`
- [ ] 6.4 Save updated Context Pool observations
- [ ] 6.5 Emit WebSocket event to notify UI of pin state change
- [ ] 6.6 Add `POST /api/learning/unpin` endpoint for unpinning observations
- [ ] 6.7 Clear `pinned`, `pinnedBy`, and `pinnedAt` fields when unpinning
- [ ] 6.8 Make pin/unpin operations idempotent (return success if already in desired state)
- [ ] 6.9 Add `POST /api/learning/batch/pin` and `POST /api/learning/batch/unpin` endpoints
- [ ] 6.10 Write integration tests for pin/unpin API endpoints

## 7. Archive Pool UI

- [x] 7.1 Create `web/client/src/pages/Archive.tsx` component for Archive Pool management
- [x] 7.2 Fetch and display all archived observations with archive reason, timestamp, and observation details
- [x] 7.3 Add filter dropdown for archive reasons (user_ignored, user_deleted, active_capacity, context_capacity, expired)
- [x] 7.4 Implement observation selection with checkboxes (single and batch selection)
- [x] 7.5 Add "Restore to Active" button that calls `/api/learning/unignore` with targetPool='active'
- [x] 7.6 Add "Restore to Context" button that calls `/api/learning/unignore` with targetPool='context'
- [x] 7.7 Update UI to remove restored observations from Archive Pool view after successful restoration
- [x] 7.8 Add success/error notifications for restoration operations
- [x] 7.9 Add Archive Pool route to navigation menu
- [ ] 7.10 Write unit tests for Archive component with mocked API calls

## 8. Context Pool Pinning UI

- [x] 8.1 Update `web/client/src/components/ObservationCard.tsx` to add pin button (📌 icon) for Context Pool observations
- [x] 8.2 Display filled pin icon and "Pinned" badge for observations with `pinned = true`
- [x] 8.3 Display outline pin icon for unpinned observations
- [x] 8.4 Implement pin button click handler that calls `/api/learning/pin` or `/api/learning/unpin`
- [x] 8.5 Move pinned observations to top of Context Pool list (sort by `pinned` desc, then by default sort)
- [x] 8.6 Update `web/client/src/pages/LearningReview.tsx` to support batch pin/unpin operations
- [x] 8.7 Add "Pin Selected" and "Unpin Selected" buttons in Context Pool batch action bar
- [x] 8.8 Implement warning message when user has pinned 20+ observations: "You have X pinned observations. Consider reviewing older pins."
- [ ] 8.9 Write unit tests for pin UI interactions

## 9. Capacity Configuration UI

- [x] 9.1 Update `web/client/src/pages/Settings.tsx` to add "Context Pool Capacity" section
- [x] 9.2 Add enable/disable toggle for Context Pool capacity management
- [x] 9.3 Add input fields for targetSize, maxSize, and halfLifeDays with validation
- [x] 9.4 Implement form validation: targetSize ≤ maxSize, all values > 0
- [x] 9.5 Disable input fields when capacity management toggle is off
- [x] 9.6 Load current configuration from backend API on component mount
- [x] 9.7 Implement Save button that calls backend API to update `~/.claude-evolution/config.json`
- [x] 9.8 Display current Context Pool statistics: observation count, pinned count, utilization percentage, status (OK/Over capacity)
- [x] 9.9 Show warning indicator when Context Pool size > maxSize
- [x] 9.10 Add success/error notifications for configuration updates
- [ ] 9.11 Write unit tests for Settings component capacity config section

## 10. Configuration Management

- [x] 10.1 Add `learning.capacity.context` section to default config template in `src/config/loader.ts`
- [x] 10.2 Set default values: `enabled: true`, `targetSize: 50`, `maxSize: 80`, `halfLifeDays: 90`
- [x] 10.3 Add config validation in `src/config/loader.ts` to ensure targetSize ≤ maxSize
- [x] 10.4 Log warning and auto-correct if targetSize > maxSize (use maxSize for both)
- [x] 10.5 Create `GET /api/config/capacity` endpoint to retrieve current capacity config
- [x] 10.6 Create `POST /api/config/capacity` endpoint to update capacity config and save to file
- [ ] 10.7 Write unit tests for config loading and validation

## 11. Data Migration and Backward Compatibility

- [ ] 11.1 Verify all new fields in `ObservationWithMetadata` are optional (TypeScript)
- [ ] 11.2 Test loading existing observations without new fields - ensure no errors
- [ ] 11.3 Verify capacity enforcement handles observations missing `pinned` field (treats as false)
- [ ] 11.4 Test LLM merge with observations lacking `mergeInfo` field
- [ ] 11.5 Verify Archive Pool handles both old `'capacity_control'` and new specific archive reasons
- [ ] 11.6 Test system with empty config.json (uses defaults) and with partial config (merges with defaults)

## 12. Integration Testing

- [ ] 12.1 Test complete flow: LLM merge detects ignored observation → inherits ignore state → auto-archives
- [ ] 12.2 Test complete flow: User ignores observation → later restores from Archive → observation returns to Context Pool → CLAUDE.md updates
- [ ] 12.3 Test complete flow: Context Pool exceeds capacity → capacity enforcement runs → lowest scoring observations archived → pinned observations protected
- [ ] 12.4 Test complete flow: User pins 20 observations → adds 21st pin → sees warning in UI
- [ ] 12.5 Test complete flow: User changes capacity config in Settings → learning cycle runs → new limits enforced
- [ ] 12.6 Test performance: Learning cycle with 200 Context Pool observations including 50 pinned → verify capacity enforcement completes in <500ms
- [ ] 12.7 Test edge case: All Context Pool observations are pinned → capacity enforcement skipped → no archives created
- [ ] 12.8 Test edge case: Archive Pool restoration when target pool doesn't exist → verify error handling

## 13. Documentation and Cleanup

- [ ] 13.1 Update CHANGELOG.md with new features: ignore protection, unignore, Context Pool capacity, pinning
- [ ] 13.2 Add user documentation for Archive Pool restoration workflow
- [ ] 13.3 Add user documentation for pinning observations
- [ ] 13.4 Add user documentation for configuring Context Pool capacity in Settings
- [ ] 13.5 Update API documentation with new endpoints (unignore, pin, unpin, config)
- [ ] 13.6 Add inline code comments explaining ignore inheritance logic in llm-merge.ts
- [ ] 13.7 Add inline code comments explaining pinning protection in enforceContextCapacity()
