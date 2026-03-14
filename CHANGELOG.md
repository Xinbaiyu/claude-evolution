# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
