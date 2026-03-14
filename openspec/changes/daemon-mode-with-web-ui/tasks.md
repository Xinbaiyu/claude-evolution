## 1. Process Management Infrastructure

- [x] 1.1 Create `src/daemon/process-manager.ts`
- [x] 1.2 Implement PID file write with JSON format (pid, startTime, port, version)
- [x] 1.3 Implement PID file read with validation
- [x] 1.4 Implement isDaemonRunning() with stale PID detection
- [x] 1.5 Implement signal handlers (SIGTERM, SIGINT)
- [x] 1.6 Implement graceful shutdown with 30s timeout
- [x] 1.7 Add unit tests for ProcessManager (80%+ coverage)

## 2. Daemon Logger

- [x] 2.1 Create `src/daemon/logger.ts`
- [x] 2.2 Implement file log output with ISO timestamp
- [x] 2.3 Implement log level filtering (INFO/WARN/ERROR)
- [x] 2.4 Implement log rotation on 10MB size limit
- [x] 2.5 Implement rotation file management (keep 7 files)
- [x] 2.6 Add unit tests for DaemonLogger

## 3. Shared State

- [x] 3.1 Create `src/daemon/shared-state.ts`
- [x] 3.2 Define DaemonState interface
- [x] 3.3 Implement EventEmitter-based event bus
- [x] 3.4 Implement state update methods for scheduler
- [x] 3.5 Implement state update methods for Web Server
- [x] 3.6 Add unit tests for SharedState

## 4. Start Command

- [x] 4.1 Create `src/cli/commands/start.ts`
- [x] 4.2 Implement duplicate start detection
- [x] 4.3 Implement foreground mode startup
- [x] 4.4 Implement background mode (fork + detach)
- [x] 4.5 Integrate CronScheduler startup
- [x] 4.6 Integrate Web Server startup
- [x] 4.7 Handle command options (--daemon, --port, --no-scheduler, --no-web)
- [x] 4.8 Write PID file on successful start
- [x] 4.9 Add integration test for start command

## 5. Stop Command

- [x] 5.1 Create `src/cli/commands/stop.ts`
- [x] 5.2 Implement PID file reading
- [x] 5.3 Send SIGTERM signal to process
- [x] 5.4 Wait for process exit with timeout
- [x] 5.5 Implement force kill on timeout (SIGKILL)
- [x] 5.6 Delete PID file after stop
- [x] 5.7 Handle "not running" scenario
- [x] 5.8 Add integration test for stop command

## 6. Restart Command

- [x] 6.1 Create `src/cli/commands/restart.ts`
- [x] 6.2 Call stop logic
- [x] 6.3 Wait for complete shutdown
- [x] 6.4 Call start logic
- [x] 6.5 Handle "not running" scenario (just start)
- [x] 6.6 Add integration test for restart command

## 7. Logs Command

- [x] 7.1 Create `src/cli/commands/logs.ts`
- [x] 7.2 Implement tail -n functionality (default 50 lines)
- [x] 7.3 Implement follow mode (--follow flag)
- [x] 7.4 Implement level filtering (--level option)
- [x] 7.5 Add colored output for log levels
- [x] 7.6 Handle missing log file scenario
- [x] 7.7 Add integration test for logs command

## 8. macOS Auto-Start

- [x] 8.1 Create `src/daemon/platform/macos.ts`
- [x] 8.2 Define plist XML template
- [x] 8.3 Implement template variable replacement (paths, user)
- [x] 8.4 Implement launchctl command wrapper
- [x] 8.5 Handle permissions and errors
- [x] 8.6 Add unit tests for macOS platform adapter

## 9. Install Command

- [x] 9.1 Create `src/cli/commands/install.ts`
- [x] 9.2 Detect operating system (macOS/Linux/Windows)
- [x] 9.3 Call platform-specific install logic
- [x] 9.4 Handle --enable flag (start immediately)
- [x] 9.5 Prevent duplicate installation
- [x] 9.6 Display success message with next steps
- [x] 9.7 Add integration test for install command

## 10. Uninstall Command

- [x] 10.1 Create `src/cli/commands/uninstall.ts`
- [x] 10.2 Stop running daemon if active
- [x] 10.3 Unload LaunchAgent via launchctl
- [x] 10.4 Delete plist file
- [x] 10.5 Handle "not installed" scenario
- [x] 10.6 Display success message
- [x] 10.7 Add integration test for uninstall command

## 11. Enhanced Status Command

- [x] 11.1 Modify `src/cli/commands/status.ts`
- [x] 11.2 Add daemon process status section (PID, uptime)
- [x] 11.3 Add Web UI section (URL, port)
- [x] 11.4 Add scheduler section (last/next execution)
- [x] 11.5 Calculate uptime from PID file startTime
- [x] 11.6 Handle "not running" state gracefully
- [x] 11.7 Update integration test for status command

## 12. Web API Endpoint

- [x] 12.1 Add `GET /api/daemon/status` route to Web Server
- [x] 12.2 Return complete DaemonState as JSON
- [x] 12.3 Add CORS headers
- [x] 12.4 Add integration test for API endpoint

## 13. Configuration Schema

- [x] 13.1 Modify `src/config/schema.ts`
- [x] 13.2 Add DaemonConfigSchema with Zod
- [x] 13.3 Add WebUIConfigSchema with Zod
- [x] 13.4 Update DEFAULT_CONFIG with defaults
- [x] 13.5 Implement config migration for backward compatibility
- [x] 13.6 Add unit tests for schema validation
- [x] 13.7 Add test for config migration

## 14. CLI Registration

- [x] 14.1 Modify `src/cli/index.ts`
- [x] 14.2 Register start command
- [x] 14.3 Register stop command
- [x] 14.4 Register restart command
- [x] 14.5 Register logs command
- [x] 14.6 Register install command
- [x] 14.7 Register uninstall command
- [x] 14.8 Verify --help output includes all new commands

## 15. Integration with Existing Components

- [x] 15.1 Modify Web Server to accept shared state reference
- [x] 15.2 Modify CronScheduler to emit events on execution
- [x] 15.3 Update WebSocket broadcast to listen for daemon events
- [x] 15.4 Test scheduler + Web Server running in same process

## 16. End-to-End Testing

- [x] 16.1 Test full lifecycle: start → stop → restart
- [ ] 16.2 Test install → reboot → verify auto-start (manual)
- [ ] 16.3 Test uninstall → verify no auto-start
- [x] 16.4 Test port conflict handling
- [ ] 16.5 Test PID file stale detection
- [ ] 16.6 Test graceful shutdown during analysis
- [ ] 16.7 Test log rotation
- [x] 16.8 Test all command options

## 17. Documentation

- [x] 17.1 Update `README.md` with daemon usage section
- [x] 17.2 Update `docs/CLI_REFERENCE.md` with new commands
- [x] 17.3 Update `docs/DEPLOYMENT.md` with auto-start guide
- [x] 17.4 Create `docs/DAEMON.md` with detailed daemon documentation
- [x] 17.5 Add troubleshooting section for common issues

## 18. Code Quality

- [ ] 18.1 Run full test suite and ensure all pass
- [ ] 18.2 Verify code coverage >= 80% for new modules
- [ ] 18.3 Run TypeScript type checking (tsc --noEmit)
- [ ] 18.4 Fix all linting errors
- [ ] 18.5 Review error messages for user-friendliness

## 19. Performance & Security

- [ ] 19.1 Verify memory usage < 50MB for idle daemon
- [ ] 19.2 Verify startup time < 3 seconds
- [ ] 19.3 Check for resource leaks (file handles, sockets)
- [ ] 19.4 Validate PID file permissions (600)
- [ ] 19.5 Validate log file permissions (644)

## 20. Release Preparation

- [ ] 20.1 Update CHANGELOG.md with v0.2.0 changes
- [ ] 20.2 Update version in package.json to 0.2.0
- [ ] 20.3 Run `npm run build` and verify success
- [ ] 20.4 Test installation from built package
- [ ] 20.5 Write release notes
- [ ] 20.6 Create git tag v0.2.0
