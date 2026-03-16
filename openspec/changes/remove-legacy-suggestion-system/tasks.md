# Implementation Tasks: Remove Legacy Suggestion System

## 1. Migration Script

- [x] 1.1 Create `src/scripts/migrate-suggestions.ts` with ObservationWithMetadata conversion logic
- [x] 1.2 Add CLI command `migrate-suggestions` in `src/cli/index.ts`
- [x] 1.3 Implement backup creation (pending.json → pending.json.backup-YYYYMMDD)
- [x] 1.4 Implement marker file creation at `~/.claude-evolution/learned/.migrated`
- [x] 1.5 Add migration summary output (count migrated, backup path, next steps)
- [x] 1.6 Write unit tests for migration logic
- [x] 1.7 Test with sample pending.json data
- [x] 1.8 Document migration command in docs/CLI_REFERENCE.md

## 2. Backend API Cleanup

- [x] 2.1 Delete `web/server/routes/suggestions.ts`
- [x] 2.2 Delete `web/server/routes/suggestions.d.ts`
- [x] 2.3 Remove suggestions route registration from `web/server/index.ts`
- [x] 2.4 Delete `src/learners/suggestion-manager.ts`
- [x] 2.5 Delete `src/learners/suggestion-manager.test.ts`
- [x] 2.6 Update `src/learners/index.ts` to remove suggestion manager exports
- [x] 2.7 Run `npm run build` and fix any compilation errors
- [x] 2.8 Verify API server starts without errors

## 3. CLI Commands Cleanup

- [x] 3.1 Delete `src/cli/commands/approve.ts`
- [x] 3.2 Delete `src/cli/commands/review.ts` (check if it's already replaced)
- [x] 3.3 Delete `src/cli/commands/history.ts`
- [x] 3.4 Remove command registrations from `src/cli/index.ts`
- [x] 3.5 Verify remaining CLI commands still function (status, analyze, etc.)
- [x] 3.6 Test CLI help output shows correct commands

## 4. Type Definitions Cleanup

- [x] 4.1 Create `src/types/legacy.ts` with deprecation notice
- [x] 4.2 Move Suggestion/Preference/Pattern/Workflow types to legacy.ts
- [x] 4.3 Add JSDoc @deprecated tags to all legacy types
- [x] 4.4 Update imports in test files to use legacy.ts
- [x] 4.5 Verify TypeScript compilation succeeds
- [x] 4.6 Grep codebase for remaining non-test usage of legacy types

## 5. Test Files Cleanup

- [x] 5.1 Delete `tests/unit/suggestion-manager.test.ts` (if exists)
- [x] 5.2 Update `tests/integration/cli-workflow.test.ts` to remove legacy command tests
- [x] 5.3 Update `tests/integration/web-api.test.ts` to remove suggestions endpoint tests
- [x] 5.4 Update `tests/helpers/mock-data.ts` to remove suggestion generators
- [x] 5.5 Fix `src/analyzers/experience-extractor.test.ts` if using legacy types
- [x] 5.6 Fix `src/daemon/shared-state.test.ts` if using legacy types
- [x] 5.7 Run full test suite and ensure all pass

## 6. Frontend Cleanup

- [x] 6.1 Review `web/client/src/pages/Review.tsx` and remove any legacy suggestion logic
- [x] 6.2 Update `web/client/src/api/client.ts` to remove unused suggestion API calls
- [x] 6.3 Check `web/client/src/components/ManualAnalysisTrigger.tsx` for legacy references
- [x] 6.4 Fix `web/client/src/pages/Dashboard.tsx` suggestion references (12 places with optional chaining)
- [x] 6.5 Test WebUI loads and functions correctly

## 7. WebSocket and Notification Cleanup

- [x] 7.1 Check `web/server/websocket.ts` for suggestion-related broadcasts
- [x] 7.2 Check `web/server/notifications.ts` for suggestion notifications
- [x] 7.3 Update or remove suggestion-related WebSocket events
- [x] 7.4 Test real-time updates still work in WebUI

## 8. Configuration and State Cleanup

- [x] 8.1 Review `src/config/schema.ts` for legacy suggestion config fields
- [x] 8.2 Check `src/scheduler/state-manager.ts` for suggestion state tracking
- [x] 8.3 Remove suggestion-related config validation if present
- [x] 8.4 Update DEFAULT_CONFIG if needed

## 9. Documentation Updates

- [x] 9.1 Create `docs/MIGRATION_V03_TO_V04.md` with migration guide
- [x] 9.2 Update `CHANGELOG.md` with v0.4.0 breaking changes section
- [x] 9.3 Update `README.md` to remove old CLI command examples
- [x] 9.4 Update `docs/CLI_REFERENCE.md` to remove legacy commands
- [x] 9.5 Archive old suggestion docs in `docs/archive/v0.2.x/`
- [x] 9.6 Update `docs/API.md` to remove /api/suggestions endpoints

## 10. Final Verification

- [x] 10.1 Run full TypeScript build: `npm run build`
- [x] 10.2 Run complete test suite: `npm test`
- [x] 10.3 Run TypeScript type checking: `tsc --noEmit`
- [x] 10.4 Run ESLint: `npm run lint`
- [x] 10.5 Grep entire codebase for "suggestion" and verify all remaining uses are intentional
- [x] 10.6 Grep for "pending.json", "approved.json", "rejected.json"
- [x] 10.7 Manual test: Fresh install simulation
- [x] 10.8 Manual test: Migration from v0.3.0 with sample pending.json
- [x] 10.9 Manual test: WebUI Learning Review full workflow
- [x] 10.10 Create git tag: `v0.4.0-legacy-cleanup`

## 11. Cleanup Legacy.ts (Post-Deployment)

- [ ] 11.1 After 2 weeks of stable v0.4.0, delete `src/types/legacy.ts`
- [ ] 11.2 Verify no compilation errors after deletion
- [ ] 11.3 Remove from git history if desired (squash cleanup commits)
