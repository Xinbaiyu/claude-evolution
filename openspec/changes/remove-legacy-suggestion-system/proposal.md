## Why

The v0.3.0 incremental learning system has completely replaced the v0.2.x manual suggestion approval workflow. The legacy suggestion system (pending/approved/rejected JSON files, manual CLI review, old API endpoints) is now redundant and creates confusion with duplicate functionality. Removing it will eliminate technical debt, reduce maintenance burden, and provide a cleaner codebase focused on the new observation-based architecture.

## What Changes

- Remove legacy `~/.claude-evolution/learned/` directory and all related file operations
- Delete old suggestion API endpoints (`/api/suggestions`, approve/reject routes)
- Remove CLI commands: `review`, `approve`, `history` (legacy versions that operate on pending.json)
- Delete suggestion-manager and related learner code
- Remove Suggestion, Preference, Pattern, Workflow type definitions (replaced by ObservationWithMetadata)
- Clean up all test files referencing legacy suggestion system
- Update documentation to remove references to manual approval workflow
- **BREAKING**: Users must use WebUI `/learning-review` or new learning APIs instead of old CLI commands
- **BREAKING**: Old `~/.claude-evolution/learned/` data structure no longer supported

## Capabilities

### New Capabilities
<!-- None - this is a removal/cleanup change -->

### Modified Capabilities
- `legacy-migration`: Add one-time migration script for users with existing pending.json data to migrate to active.json

## Impact

**Files to Delete:**
- `src/cli/commands/approve.ts`
- `src/cli/commands/review.ts` (legacy version)
- `src/cli/commands/history.ts`
- `src/learners/suggestion-manager.ts`
- `src/learners/suggestion-manager.test.ts`
- `web/server/routes/suggestions.ts`
- `web/server/routes/suggestions.d.ts`

**Files to Modify:**
- `src/cli/index.ts` - Remove command registrations
- `src/types/index.ts` - Remove legacy type definitions
- `src/learners/index.ts` - Remove suggestion manager exports
- `web/server/index.ts` - Remove suggestions route
- `web/client/src/pages/Review.tsx` - Remove old suggestion logic
- `web/client/src/api/client.ts` - Remove old API calls
- All test files - Remove legacy suggestion mocks and tests

**User Impact:**
- CLI users must transition to WebUI for observation management
- Existing scripts calling `/api/suggestions` will break (provide migration guide)
- One-time manual cleanup: users should delete `~/.claude-evolution/learned/` after migration
