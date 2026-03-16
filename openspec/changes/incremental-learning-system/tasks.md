# Implementation Tasks: Incremental Learning System

## 1. Data Structure & Storage (Week 1)

- [x] 1.1 Create `src/types/learning.ts` with `ObservationWithMetadata` interface
- [x] 1.2 Add memory module: `src/memory/observation-manager.ts`
- [x] 1.3 Implement `loadActiveObservations()` function
- [x] 1.4 Implement `saveActiveObservations()` function
- [x] 1.5 Implement `loadContextObservations()` function
- [x] 1.6 Implement `saveContextObservations()` function
- [x] 1.7 Implement `loadArchivedObservations()` function
- [x] 1.8 Implement `saveArchivedObservations()` function
- [x] 1.9 Create directory structure: `~/.claude-evolution/memory/observations/`
- [x] 1.10 Add schema validation for observation files (Zod)
- [x] 1.11 Write unit tests for observation manager (80%+ coverage)

## 2. Temporal Decay Algorithm (Week 1)

- [x] 2.1 Create `src/memory/temporal-decay.ts` module
- [x] 2.2 Implement `applyTemporalDecay(originalConfidence, firstSeen, halfLifeDays)` function
- [x] 2.3 Add configuration schema for decay settings (halfLifeDays, enabled)
- [x] 2.4 Implement decay calculation with edge case handling (zero age, missing timestamps)
- [x] 2.5 Add decay logging for audit trail
- [x] 2.6 Write unit tests for decay algorithm (test multiple half-life values)
- [x] 2.7 Add integration test: decay with configurable half-life

## 3. LLM Merge Integration (Week 2)

- [x] 3.1 Create `src/learners/llm-merge.ts` module
- [x] 3.2 Design Stage 1 prompt template (merge & deduplicate)
- [x] 3.3 Design Stage 2 prompt template (confidence adjustment)
- [x] 3.4 Implement `mergeLLM(oldObservations, newObservations)` function
- [x] 3.5 Implement LLM response parsing with error handling
- [x] 3.6 Add merge quality detection (warn if > 50% reduction)
- [x] 3.7 Implement merge input size limits (top 50 old + top 20 new)
- [x] 3.8 Add token usage logging
- [x] 3.9 Implement fallback strategy for LLM failures (timeout, invalid JSON)
- [x] 3.10 Write unit tests for merge logic (mock LLM responses)
- [x] 3.11 Write integration test: end-to-end merge with real LLM

## 4. Auto-Promotion Logic (Week 2)

- [x] 4.1 Create `src/memory/promotion.ts` module
- [x] 4.2 Implement `calculateTier(observation)` function (gold/silver/bronze)
- [x] 4.3 Implement `shouldPromote(observation)` function with dual-threshold logic
- [x] 4.4 Implement `promoteToContext(observations)` function
- [x] 4.5 Implement manual override handling (skip auto-demotion)
- [x] 4.6 Add promotion logging and notification
- [x] 4.7 Implement duplicate detection (inContext flag check)
- [x] 4.8 Add configuration for promotion thresholds
- [x] 4.9 Write unit tests for tier calculation
- [ ] 4.10 Write integration test: auto-promotion flow

## 5. Deletion Strategy (Week 2)

- [x] 5.1 Create `src/memory/deletion.ts` module
- [x] 5.2 Implement `shouldDelete(observation)` function (immediate + delayed thresholds)
- [x] 5.3 Implement manual override protection (skip deletion if manualOverride exists)
- [x] 5.4 Add deletion logging
- [x] 5.5 Write unit tests for deletion logic
- [ ] 5.6 Write integration test: decay triggers deletion

## 6. Capacity Control (Week 3)

- [x] 6.1 Create `src/memory/capacity-control.ts` module
- [x] 6.2 Implement `calculateScore(observation)` function (confidence × mentions)
- [x] 6.3 Implement `enforceCapacity(observations)` function with priority ranking
- [x] 6.4 Implement archiving: move pruned observations to `archived.json`
- [x] 6.5 Implement archive expiration (delete > 30 days old)
- [x] 6.6 Implement pruning safety limit (max 30% per cycle)
- [x] 6.7 Add capacity control logging
- [x] 6.8 Add configuration for capacity limits (targetSize, maxSize, minSize)
- [x] 6.9 Write unit tests for scoring and ranking
- [ ] 6.10 Write integration test: capacity control with archiving

## 7. Scheduler Integration (Week 3)

- [x] 7.1 Modify `src/daemon/cron-scheduler.ts`
- [x] 7.2 Add `executeMergeAndPromote()` function
- [x] 7.3 Integrate LLM merge step after session analysis
- [x] 7.4 Apply temporal decay to merged observations
- [x] 7.5 Apply deletion strategy
- [x] 7.6 Apply capacity control
- [x] 7.7 Auto-promote qualified observations
- [x] 7.8 Save updated active.json and context.json
- [x] 7.9 Add error handling for each step
- [ ] 7.10 Write end-to-end integration test for full scheduler flow

## 8. CLAUDE.md Regeneration (Week 3)

- [x] 8.1 Create `src/memory/claudemd-generator.ts` module
- [x] 8.2 Implement `regenerateClaudeMd()` function
- [x] 8.3 Read observations from context.json
- [x] 8.4 Group observations by type (preferences, patterns, workflows)
- [x] 8.5 Generate markdown sections for each group
- [x] 8.6 Write to `~/.claude-evolution/output/CLAUDE.md`
- [x] 8.7 Add templating for consistent formatting
- [x] 8.8 Write unit tests for markdown generation
- [x] 8.9 Write integration test: context changes → CLAUDE.md updated

## 9. Configuration Schema (Week 4)

- [x] 9.1 Modify `src/config/schema.ts`
- [x] 9.2 Add `LearningConfig` with Zod schema
- [x] 9.3 Add capacity config fields (targetSize, maxSize, minSize)
- [x] 9.4 Add decay config fields (halfLifeDays, enabled)
- [x] 9.5 Add promotion config fields (autoConfidence, autoMentions, etc.)
- [x] 9.6 Add deletion config fields (immediateThreshold, delayedThreshold, delayedDays)
- [x] 9.7 Update DEFAULT_CONFIG with learning defaults
- [x] 9.8 Implement config validation for value ranges
- [x] 9.9 Add config migration for backward compatibility
- [x] 9.10 Write unit tests for config schema validation

## 10. WebUI Backend API (Week 4)

- [x] 10.1 Create `src/web/routes/learning.ts`
- [x] 10.2 Add `GET /api/learning/observations` endpoint (list active/context/archived)
- [x] 10.3 Add `POST /api/learning/promote` endpoint (manual promotion)
- [x] 10.4 Add `POST /api/learning/demote` endpoint (manual demotion)
- [x] 10.5 Add `POST /api/learning/ignore` endpoint (set manual override)
- [x] 10.6 Add `POST /api/learning/delete` endpoint (delete observation)
- [x] 10.7 Add `POST /api/learning/restore` endpoint (restore from archive)
- [x] 10.8 Add `GET /api/learning/stats` endpoint (pool statistics)
- [x] 10.9 Add `PUT /api/learning/config` endpoint (update learning config)
- [x] 10.10 Implement error handling and validation for all endpoints
- [x] 10.11 Write API integration tests

## 11. WebUI Settings Page (Week 5)

- [x] 11.1 Create `web/client/src/pages/Settings/LearningTab.tsx`
- [x] 11.2 Add capacity slider: "Candidate Pool Size" (10-200)
- [x] 11.3 Add decay slider: "Memory Half-Life" (7-90 days)
- [x] 11.4 Add decay toggle: "Enable Temporal Decay"
- [x] 11.5 Add promotion threshold inputs (confidence %, mentions count)
- [x] 11.6 Add deletion threshold inputs (immediate %, delayed %, delay days)
- [x] 11.7 Display current pool statistics (size, tier breakdown, progress bar)
- [x] 11.8 Display last merge timestamp
- [x] 11.9 Implement save button with validation
- [x] 11.10 Add success/error toast notifications
- [x] 11.11 Write component tests for LearningTab

## 12. WebUI Review Page Enhancement (Week 5)

- [x] 12.1 Modify `web/client/src/pages/Review.tsx`
- [x] 12.2 Add tier grouping: Gold, Silver, Bronze sections
- [x] 12.3 Display observation count per tier
- [x] 12.4 Implement collapsible tier sections
- [x] 12.5 Display decay-adjusted confidence (original → decayed)
- [x] 12.6 Highlight observations with >20% decay
- [x] 12.7 Add "Bulk Approve Gold" button
- [x] 12.8 Add manual action buttons: Promote, Ignore, Delete
- [x] 12.9 Display evidence sessions (top 3, collapsible)
- [x] 12.10 Display merge history (mergedFrom IDs)
- [x] 12.11 Add filter by type (preference/pattern/workflow)
- [x] 12.12 Add filter by tier (gold/silver/bronze)
- [x] 12.13 Add search box (filter by text)
- [x] 12.14 Write component tests for enhanced Review page

## 13. WebUI Archived Tab (Week 5)

- [x] 13.1 Create `web/client/src/pages/Review/ArchivedTab.tsx`
- [x] 13.2 Fetch archived observations from API
- [x] 13.3 Display archive timestamp and reason
- [x] 13.4 Display expiration countdown ("Expires in X days")
- [x] 13.5 Add "Restore" button per observation
- [x] 13.6 Add "Delete Forever" button with confirmation dialog
- [x] 13.7 Write component tests for ArchivedTab

## 14. Testing & Quality Assurance (Week 6)

- [x] 14.1 Run full unit test suite: `npm test`
- [x] 14.2 Verify unit test coverage ≥ 80%
- [x] 14.3 Run TypeScript type checking: `tsc --noEmit`
- [x] 14.4 Run ESLint and fix warnings
- [x] 14.5 Write end-to-end test: full learning cycle (analyze → merge → promote → regenerate CLAUDE.md)
- [x] 14.6 Write E2E test: WebUI settings changes reflect in backend
- [x] 14.7 Write E2E test: Manual promotion flow
- [x] 14.8 Load test: simulate 1000 observations in active.json
- [x] 14.9 Performance test: merge time < 10s for 50+20 observations
- [x] 14.10 Token usage test: verify merge cost < $0.02 per cycle

## 15. Documentation (Week 6)

- [x] 15.1 Update `README.md` with learning system overview
- [x] 15.2 Create `docs/LEARNING.md` with detailed system explanation
- [x] 15.3 Document temporal decay algorithm and half-life tuning
- [x] 15.4 Document promotion thresholds and when to adjust them
- [x] 15.5 Add troubleshooting section: common issues and fixes
- [x] 15.6 Add WebUI screenshots for Settings and Review pages
- [x] 15.7 Update `docs/CLI_REFERENCE.md` if new commands added
- [x] 15.8 Add migration guide for existing users

## 16. Migration & Rollout (Week 6)

- [ ] 16.1 Create data migration script: `pending.json` → `active.json`
- [ ] 16.2 Implement backward compatibility check
- [ ] 16.3 Add feature flag: `config.learning.enabled` (default: true)
- [ ] 16.4 Test migration on local instance
- [ ] 16.5 Update CHANGELOG.md with v0.3.0 changes
- [ ] 16.6 Update version in package.json to 0.3.0
- [ ] 16.7 Build production bundle: `npm run build`
- [ ] 16.8 Test installation from built package
- [ ] 16.9 Write release notes
- [ ] 16.10 Create git tag v0.3.0

## 17. Post-Launch Monitoring (Week 7)

- [ ] 17.1 Monitor token usage in production (verify < 100k/day)
- [ ] 17.2 Monitor pool size stability (verify 50±10 range)
- [ ] 17.3 Collect user feedback on auto-promotion quality
- [ ] 17.4 Monitor LLM merge quality (false positives/negatives)
- [ ] 17.5 Iterate on prompt templates based on merge results
