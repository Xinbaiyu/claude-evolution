# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-03-15

### 🚨 Breaking Changes

#### Complete Removal of Legacy Suggestion System
The v0.2.x suggestion system has been **completely removed** from the codebase. All suggestion-related code, files, and APIs have been deleted.

**Deleted Files**:
- `~/.claude-evolution/suggestions/` directory (including pending.json, approved.json, rejected.json)
- `web/client/src/pages/Review.tsx` (legacy review page)
- All deprecated TypeScript types: `Suggestion`, `Preference`, `Pattern`, `Workflow`
- Deprecated WebSocket methods: `emitSuggestionApproved()`, `emitSuggestionRejected()`

**Removed API Fields**:
- `SystemStatus.suggestions` field removed from `/api/status` response
- All backward-compatibility code for reading legacy suggestion files

**Migration Completed**: If you haven't migrated yet, the migration script still exists at `src/scripts/migrate-suggestions.ts`, but the legacy suggestion files are no longer read by the system. All data must now use the observation pool format.

---

#### Legacy Suggestion System Removed
The v0.2.x suggestion system (pending/approved/rejected workflow) has been completely removed in favor of the observation-based learning system introduced in v0.3.0.

**Removed CLI Commands**:
- `claude-evolution approve <id>` - Use WebUI Learning Review instead
- `claude-evolution reject <id>` - Use WebUI Learning Review instead
- `claude-evolution review` - Now redirects to WebUI Learning Review
- `claude-evolution history` - Use WebUI Learning Review for observation history

**Removed API Endpoints**:
- `GET /api/suggestions`
- `GET /api/suggestions/:id`
- `POST /api/suggestions/:id/approve`
- `POST /api/suggestions/:id/reject`
- `POST /api/suggestions/batch/approve`
- `POST /api/suggestions/batch/reject`

**Migration Required**: Run `claude-evolution migrate-suggestions` to convert old suggestion data to the new observation format. See [MIGRATION_V03_TO_V04.md](./docs/MIGRATION_V03_TO_V04.md) for details.

### ✨ New Features

#### Migration Tool
- **One-time Migration**: `claude-evolution migrate-suggestions` command
- Converts `pending.json` suggestions to `active.json` observations
- Automatic backup creation (`pending.json.backup-YYYYMMDD`)
- Prevents duplicate migrations with `.migrated` marker file
- Comprehensive migration summary with statistics

### 🔧 Improvements

#### WebUI
- **Dashboard**: Made suggestion stats optional (graceful fallback to 0)
- **Review Page**: Now redirects to Learning Review page
- **ManualAnalysisTrigger**: Updated to support both legacy and new observation count formats

#### Type System
- Created `src/types/legacy.ts` with deprecation warnings
- All legacy types (`Suggestion`, `Preference`, `Pattern`, `Workflow`) marked as `@deprecated`
- Improved type safety with optional chaining for legacy fields

#### WebSocket Events
- Added new observation events: `observation_promoted`, `observation_demoted`, `observation_archived`
- Marked legacy events as deprecated: `new_suggestions`, `suggestion_approved`, `suggestion_rejected`
- Backward compatible with existing event listeners

### 🐛 Bug Fixes
- Fixed TypeScript compilation errors in Dashboard and Review pages
- Fixed missing optional chaining for `status.suggestions` field
- Fixed Review page API method calls after suggestion API removal

### 📚 Documentation
- Added comprehensive migration guide: `docs/MIGRATION_V03_TO_V04.md`
- Updated `docs/CLI_REFERENCE.md` to document `migrate-suggestions` command
- Added deprecation notices to all legacy types and APIs

### 🧹 Code Cleanup
- Removed `src/learners/suggestion-manager.ts` and tests
- Removed `web/server/routes/suggestions.ts` and type definitions
- Cleaned up test files to remove legacy suggestion references
- Updated integration tests to remove approve/reject workflow tests

### ⚠️ Deprecation Notices
Legacy types will be completely removed in v0.5.0:
- `Suggestion`, `Preference`, `Pattern`, `Workflow` (use `ObservationWithMetadata` instead)
- `LearningResult.toSuggest` field (observations are now automatically managed)
- WebSocket events: `new_suggestions`, `suggestion_approved`, `suggestion_rejected`

---

## [0.2.0] - 2026-03-14

### ✨ Major Features

#### Daemon Mode
- **Background Service**: Added full daemon mode with start/stop/restart commands
- **Process Management**: PID file tracking, stale process detection, and graceful shutdown
- **Auto-start Support**: macOS LaunchAgent integration for boot persistence
- **Logging System**: Rotating log files with configurable levels (INFO/WARN/ERROR)
- **Enhanced Status**: Real-time daemon status with PID, uptime, and service health

#### Web UI Enhancements
- **Manual Analysis Trigger**: One-click analysis execution from Dashboard
- **Settings Page**: Complete configuration management for scheduler, LLM, and notifications
  - Claude Code Router support with API endpoint configuration
  - API Key environment variable guidance
  - Real-time API endpoint status indicator (Official API vs Router)
  - Model selection (5 Claude models supported)
  - Temperature and token controls
  - Prompt caching toggle
- **Real-time Updates**: WebSocket integration for live analysis progress
- **Desktop Notifications**: macOS notification support for analysis completion

### 🔧 New Commands

```bash
claude-evolution start [--daemon] [--port <port>]  # Start daemon
claude-evolution stop                              # Stop daemon
claude-evolution restart                           # Restart daemon
claude-evolution logs [-f] [-n <lines>]            # View logs
claude-evolution install [--enable]                # Setup auto-start
claude-evolution uninstall                         # Remove auto-start
claude-evolution status                            # Enhanced status
```

### 🏗️ Infrastructure

#### Configuration
- New `daemon` configuration section with PID/log management
- New `webUI` configuration section with port/CORS settings
- Backward-compatible config migration for existing installations
- Zod-based schema validation for type safety

#### API Endpoints
- `POST /api/analyze` - Trigger manual analysis (now executes real analysis)
- `GET /api/daemon/status` - Daemon process status
- `GET /api/config` - Read configuration
- `PATCH /api/config` - Update configuration
- Enhanced WebSocket events for analysis lifecycle

#### Testing
- **Test Coverage**: 233 passing tests (100% pass rate)
- **Integration Tests**: Full daemon lifecycle, Web API, CLI commands
- **Unit Tests**: ProcessManager, DaemonLogger, SharedState, config migration
- **Concurrency Fixes**: Isolated test directories to prevent race conditions

#### Code Quality
- **ESLint**: TypeScript-aware linting with 97 checks (31 errors, 66 warnings)
- **Type Safety**: Strict TypeScript with comprehensive type definitions
- **Error Handling**: Improved error messages and user guidance

### 📦 Dependencies

#### Added
- `node-cron@^3.0.3` - Scheduled analysis execution
- `node-notifier@^10.0.1` - Desktop notifications
- `ws@^8.16.0` - WebSocket real-time communication
- `eslint@^10.0.3` - Code linting
- `typescript-eslint` - TypeScript ESLint support

### 🐛 Bug Fixes
- Fixed POST /api/analyze to execute real analysis instead of returning mock data
- Fixed WebSocket broadcast method signature (2 parameters required)
- Fixed import paths for learners module in Web Server
- Fixed test concurrency issues causing intermittent failures
- Fixed TypeScript compilation errors in Web UI components

### 📚 Documentation
- New `docs/DAEMON.md` - Comprehensive daemon system documentation
- Updated `docs/CLI_REFERENCE.md` - All new commands documented
- Updated `docs/DEPLOYMENT.md` - Auto-start configuration guide
- Updated `README.md` - Daemon usage section
- Troubleshooting guide for common issues

### 🎨 UI/UX Improvements
- Brutalist design system with bold typography and high contrast
- Real-time analysis progress feedback
- API endpoint status visualization (green=Official, cyan=Router)
- Clear environment variable configuration guidance
- Responsive Settings page with organized sections

### ⚡ Performance
- Asynchronous analysis execution (202 Accepted response)
- Concurrent request prevention with isAnalyzing flag
- Efficient WebSocket broadcasting
- Log rotation to prevent disk bloat

### 🔒 Security
- API Key stored in environment variables (not config files)
- PID file permissions validation
- CORS configuration for Web UI
- Input validation on all API endpoints

---

## [0.1.0] - 2026-03-13

### Initial Release

- Basic Claude Code session analysis
- Preference, pattern, and workflow extraction
- Suggestion management (pending/approved/rejected)
- Manual review workflow
- CLI commands: init, analyze, review, approve, reject, history
- HTTP API for Claude Mem integration
- Configuration management
- Learning phases (observation/suggestion/automatic)

[0.2.0]: https://github.com/your-org/claude-evolution/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/claude-evolution/releases/tag/v0.1.0
