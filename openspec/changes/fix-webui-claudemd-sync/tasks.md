## 1. Add CLAUDE.md Regeneration Import

- [x] 1.1 Add import statement for `regenerateClaudeMd` from `../../memory/claudemd-generator.js` at the top of `web/server/routes/learning.ts`

## 2. Fix Promote Endpoint

- [x] 2.1 Add logging when promoting a previously ignored observation (before line 123 in promote endpoint)
- [x] 2.2 Log the previous manualOverride state for debugging

## 3. Add CLAUDE.md Regeneration to Single Operations

- [x] 3.1 Add async regenerateClaudeMd() call after saveContextObservations() in POST /api/learning/promote (line ~143)
- [x] 3.2 Add async regenerateClaudeMd() call in POST /api/learning/ignore when modifying context pool (line ~289)
- [x] 3.3 Add async regenerateClaudeMd() call in POST /api/learning/delete when deleting from context (line ~370)
- [x] 3.4 Add async regenerateClaudeMd() call in POST /api/learning/restore when restoring to context (line ~620)
- [x] 3.5 Wrap each regenerateClaudeMd() call in .catch() with error logging

## 4. Add CLAUDE.md Regeneration to Batch Operations

- [x] 4.1 Add async regenerateClaudeMd() call in POST /api/learning/batch/promote after context update
- [x] 4.2 Add async regenerateClaudeMd() call in POST /api/learning/batch/ignore if context was modified
- [x] 4.3 Add async regenerateClaudeMd() call in POST /api/learning/batch/delete if context was modified
- [x] 4.4 Wrap each batch regenerateClaudeMd() call in .catch() with error logging

## 5. Testing

- [x] 5.1 Verify TypeScript compiles without errors
- [ ] 5.2 Manual test: promote an observation and verify CLAUDE.md updates
- [ ] 5.3 Manual test: ignore a context observation and verify CLAUDE.md updates
- [ ] 5.4 Manual test: delete a context observation and verify CLAUDE.md updates
- [ ] 5.5 Manual test: ignore an observation, then promote it - verify it works
- [ ] 5.6 Manual test: batch promote multiple observations and verify CLAUDE.md updates once
- [ ] 5.7 Check logs for "previously ignored, now promoting" message
- [ ] 5.8 Verify API response times are still fast (<100ms for single operations)

## 6. Edge Cases

- [ ] 6.1 Test with empty context pool - verify CLAUDE.md handles empty state
- [ ] 6.2 Test with large context pool (50+ observations) - verify performance
- [ ] 6.3 Test rapid consecutive operations - verify no race conditions
- [ ] 6.4 Simulate regenerateClaudeMd() error - verify API operation still succeeds

## 7. Documentation

- [ ] 7.1 Update CHANGELOG.md with bug fix entry
- [ ] 7.2 Document the ignore → promote state transition behavior
- [ ] 7.3 Add note about real-time CLAUDE.md updates in user documentation
