## Context

The project has completed a major architectural shift from v0.2.x manual suggestion approval to v0.3.0 incremental learning with automatic observation management. The old system stored suggestions in `learned/pending.json` and required manual CLI review/approval. The new system uses `memory/observations/{active,context,archived}.json` with automatic promotion based on confidence scoring, temporal decay, and LLM-based merging.

Current state:
- ✅ New observation system fully operational (Phase 1-15 complete)
- ✅ WebUI Learning Review page provides full management interface
- ⚠️ Legacy suggestion code still present but not actively used
- ⚠️ Duplicate functionality creates confusion (two "review" workflows)
- ⚠️ Old API endpoints still respond but operate on empty/stale data

## Goals / Non-Goals

**Goals:**
- Remove all legacy suggestion system code (CLI commands, API routes, data structures)
- Clean up type definitions and test files referencing old system
- Provide migration path for users with existing pending.json data
- Eliminate confusion between old and new workflows
- Reduce codebase complexity and maintenance burden

**Non-Goals:**
- Not modifying the new observation system (already complete and working)
- Not creating new CLI commands (WebUI is primary interface)
- Not preserving backward compatibility (this is a breaking change)
- Not migrating old approved.json/rejected.json (only pending.json matters)

## Decisions

### Decision 1: Complete Removal vs Deprecation Warnings

**Chosen: Complete Removal**

Rationale:
- v0.3.0 is already a major version with breaking changes documented
- User explicitly prefers WebUI and wants aggressive cleanup
- Deprecation warnings would extend maintenance burden
- No evidence of external integrations depending on old API

Alternatives considered:
- Gradual deprecation with warnings → Rejected: Prolongs technical debt
- Redirect old endpoints to new → Rejected: API shapes incompatible
- Keep CLI but rewrite to use observations → Rejected: Unnecessary complexity

### Decision 2: Migration Script Scope

**Chosen: One-time CLI command for pending.json only**

Rationale:
- Only pending.json contains "work in progress" that might be valuable
- approved.json content is already in old CLAUDE.md (can be reconstructed)
- rejected.json items were intentionally discarded (no value in migrating)
- Script runs once, then self-removes after successful migration

Implementation:
```bash
claude-evolution migrate-suggestions
# Reads learned/pending.json → writes to memory/observations/active.json
# Sets appropriate metadata (confidence, mentions, firstSeen)
# Creates backup of original file
# Prints migration summary
```

### Decision 3: Type Definition Cleanup Strategy

**Chosen: Remove Suggestion/Preference/Pattern/Workflow from index.ts, keep in legacy file**

Rationale:
- Some test files might still import these during cleanup phase
- Create `src/types/legacy.ts` with deprecation comments
- After all tests cleaned up, delete legacy.ts entirely
- Prevents breaking tests in middle of cleanup

### Decision 4: Test File Cleanup Order

**Chosen: Bottom-up (unit → integration → e2e)**

Rationale:
- Unit tests break first when source code deleted
- Integration tests can be updated to use new APIs
- E2E tests already use WebUI (minimal changes needed)

Order:
1. Delete unit tests for deleted files (suggestion-manager.test.ts, etc.)
2. Update integration tests to use learning APIs
3. Update e2e tests to use /learning-review instead of old review page
4. Remove mock-data.ts legacy suggestion generators

## Risks / Trade-offs

**Risk 1: Users with pending work lose data**
→ Mitigation: Migration script with clear prompts, backup creation, rollback instructions in MIGRATION.md

**Risk 2: External scripts break silently**
→ Mitigation: Document breaking changes in CHANGELOG.md, add migration guide, bump to v0.4.0

**Risk 3: Incomplete removal leaves orphaned references**
→ Mitigation: Grep entire codebase for "suggestion", "pending.json", "approved.json" after each deletion phase

**Risk 4: Test suite becomes temporarily broken**
→ Mitigation: Fix tests immediately after each file deletion (don't accumulate failures)

**Trade-off 1: Lose CLI convenience for quick reviews**
→ Accepted: WebUI provides richer interface, user preference confirmed

**Trade-off 2: Breaking change requires version bump**
→ Accepted: v0.3.0 → v0.4.0 is appropriate for this level of change

## Migration Plan

### Phase 1: Migration Script (Week 1, Day 1-2)
1. Create `src/scripts/migrate-suggestions.ts`
2. Add CLI command `claude-evolution migrate-suggestions`
3. Test with sample pending.json data
4. Document usage in MIGRATION.md

### Phase 2: Backend Cleanup (Week 1, Day 3-4)
1. Delete `web/server/routes/suggestions.ts`
2. Remove route registration from `web/server/index.ts`
3. Delete `src/learners/suggestion-manager.ts`
4. Update `src/learners/index.ts` exports
5. Run build, fix compilation errors

### Phase 3: CLI Cleanup (Week 1, Day 5)
1. Delete `src/cli/commands/{approve,review,history}.ts`
2. Remove command registrations from `src/cli/index.ts`
3. Test remaining CLI commands still work

### Phase 4: Type and Test Cleanup (Week 2, Day 1-2)
1. Move legacy types to `src/types/legacy.ts`
2. Update imports in test files
3. Delete unit tests for removed files
4. Update integration tests to use learning APIs
5. Fix mock-data.ts

### Phase 5: Frontend Cleanup (Week 2, Day 3)
1. Remove old suggestion logic from `Review.tsx` if any remains
2. Clean up `api/client.ts` unused endpoints
3. Update `Dashboard.tsx` if referencing old stats

### Phase 6: Documentation (Week 2, Day 4)
1. Update CHANGELOG.md with v0.4.0 breaking changes
2. Create MIGRATION_V03_TO_V04.md guide
3. Update README.md to remove old CLI command examples
4. Archive old documentation in `docs/archive/`

### Phase 7: Final Verification (Week 2, Day 5)
1. Run full test suite
2. Manual WebUI testing
3. Fresh install test (simulate new user)
4. Migration test (simulate upgrade from v0.3.0)

### Rollback Strategy

If critical issues found after deployment:

```bash
git revert <cleanup-commits>
npm install
npm run build
claude-evolution restart
```

Backup strategy:
- Git tags: `v0.3.0-before-cleanup` and `v0.4.0-after-cleanup`
- Users should backup `~/.claude-evolution/` before upgrade
- Migration script creates `.backup` files automatically

## Open Questions

1. ~~Should we keep any CLI commands for power users?~~
   - **Resolved**: No, WebUI is sufficient per user preference

2. ~~What to do with users' learned/preferences.md file?~~
   - **Resolved**: Not migrated, users can manually extract if needed

3. Should migration script run automatically on first v0.4.0 startup?
   - **Decision needed**: Auto-run vs explicit command
   - Leaning toward: Explicit command with prominent documentation

4. Should we archive old suggestions as observations with special metadata?
   - **Decision needed**: Full migration vs selective
   - Leaning toward: Only migrate high-confidence items (>0.7)
