## Why

Web UI operations (promote, ignore, delete) on observations in the context pool modify `context.json` but do not regenerate `CLAUDE.md`, causing the user-facing configuration file to be out of sync with the actual state. Additionally, once an observation is marked as "ignored", users cannot promote it again because the promote endpoint doesn't handle clearing the ignore flag. These issues create confusion and reduce the usability of the manual observation management features.

## What Changes

- Add automatic `CLAUDE.md` regeneration after all Web UI operations that modify the context pool
- Fix promote endpoint to allow overriding "ignored" observations
- Add proper logging for state transitions (ignore → promote)
- Ensure CLAUDE.md reflects context pool state in real-time

## Capabilities

### New Capabilities
- `claudemd-realtime-sync`: Real-time synchronization of CLAUDE.md file when context pool is modified through Web UI operations

### Modified Capabilities
- `webui-learning`: Update observation state transition logic to allow promote after ignore

## Impact

**Affected Code**:
- `web/server/routes/learning.ts`: All endpoints that modify context pool (promote, ignore, delete, restore, batch operations)
- Requires import of `regenerateClaudeMd` from `src/memory/claudemd-generator.ts`

**User Experience**:
- Users will see CLAUDE.md update immediately after Web UI operations
- Users can now change their mind and promote an observation they previously ignored

**Breaking Changes**: None - this is a bug fix that improves existing functionality

**Performance**: Minimal impact - CLAUDE.md generation is fast (<100ms for typical context sizes)
