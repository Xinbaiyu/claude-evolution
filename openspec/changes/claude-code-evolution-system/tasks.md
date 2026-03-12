## 1. Project Setup

- [ ] 1.1 Initialize TypeScript project with tsconfig.json
- [ ] 1.2 Add dependencies: node-cron, @anthropic-ai/sdk, @modelcontextprotocol/sdk, chokidar, zod, commander
- [ ] 1.3 Add dev dependencies: @types/node, tsx, vitest
- [ ] 1.4 Create src/ directory structure: scheduler/, analyzers/, learners/, generators/, memory/, cli/
- [ ] 1.5 Setup build scripts in package.json (build, dev, test)
- [ ] 1.6 Create ~/.claude-evolution/ directory structure on first run

## 2. MCP Integration Layer

- [ ] 2.1 Create src/memory/mcp-client.ts - MCP client wrapper
- [ ] 2.2 Implement search() function using mcp__plugin_claude-mem_mcp-search__search
- [ ] 2.3 Implement timeline() function for context retrieval
- [ ] 2.4 Implement getObservations() for full content fetch
- [ ] 2.5 Add connection health check and retry logic
- [ ] 2.6 Write unit tests for MCP integration

## 3. Session Analyzer

- [ ] 3.1 Create src/scheduler/cron-scheduler.ts - Job scheduler using node-cron
- [ ] 3.2 Implement configurable intervals (daily, 12h, custom)
- [ ] 3.3 Add manual trigger via CLI command
- [ ] 3.4 Create src/analyzers/session-collector.ts - Fetch sessions from claude-mem
- [ ] 3.5 Implement incremental data collection (only new sessions since last run)
- [ ] 3.6 Add sensitive data filtering (API keys, passwords, tokens)
- [ ] 3.7 Implement user-defined blacklist support
- [ ] 3.8 Add error handling and retry logic
- [ ] 3.9 Write tests for scheduler and collector

## 4. Experience Extractor

- [ ] 4.1 Create src/analyzers/experience-extractor.ts
- [ ] 4.2 Implement LLM prompt for preference extraction
- [ ] 4.3 Implement problem-solution pattern detection prompt
- [ ] 4.4 Implement workflow pattern detection prompt
- [ ] 4.5 Add batch processing for multiple sessions
- [ ] 4.6 Implement confidence scoring algorithm
- [ ] 4.7 Add JSON schema validation for LLM outputs
- [ ] 4.8 Implement token-efficient prompt caching
- [ ] 4.9 Add fallback to Haiku model for cost optimization
- [ ] 4.10 Implement retry logic for API failures
- [ ] 4.11 Write tests for extraction logic

## 5. Preference Learner

- [ ] 5.1 Create src/learners/preference-learner.ts
- [ ] 5.2 Implement merge logic for non-conflicting preferences
- [ ] 5.3 Implement conflict detection between learned and source config
- [ ] 5.4 Add confidence threshold for auto-application (>= 0.8)
- [ ] 5.5 Generate suggestions file for low-confidence items
- [ ] 5.6 Implement preference frequency tracking
- [ ] 5.7 Create learned/preferences.md writer
- [ ] 5.8 Write tests for merge and conflict detection

## 6. Skill Detection and Creation

- [ ] 6.1 Create src/learners/skill-detector.ts
- [ ] 6.2 Implement command sequence frequency tracking
- [ ] 6.3 Add contextual grouping (file types, project structure)
- [ ] 6.4 Implement skill naming suggestion generator
- [ ] 6.5 Create src/generators/skill-creator.ts
- [ ] 6.6 Define skill templates (command, script, workflow)
- [ ] 6.7 Implement template-based skill generation
- [ ] 6.8 Add SKILL.md writer with proper formatting
- [ ] 6.9 Write tests for detection and creation

## 7. MD Config Generator

- [ ] 7.1 Create src/generators/md-generator.ts
- [ ] 7.2 Implement file assembly logic (source + learned)
- [ ] 7.3 Add section separators and metadata header
- [ ] 7.4 Implement character limit enforcement (20k default)
- [ ] 7.5 Add truncation logic (learned files first)
- [ ] 7.6 Create backup mechanism before overwriting
- [ ] 7.7 Implement soft-link creation to ~/.claude/CLAUDE.md
- [ ] 7.8 Add file watching for source files with chokidar
- [ ] 7.9 Write tests for assembly and truncation

## 8. Evolution Dashboard CLI

- [ ] 8.1 Create src/cli/commands.ts using commander
- [ ] 8.2 Implement `init` command - Initialize directory structure with safety checks
- [ ] 8.2.1 Add detection for existing ~/.claude/CLAUDE.md
- [ ] 8.2.2 Implement permanent backup creation with timestamp
- [ ] 8.2.3 Create interactive prompt with 3 migration options (Import/Keep/Cancel)
- [ ] 8.2.4 Implement intelligent config parser and splitter
- [ ] 8.2.5 Add UNMAPPED.md generation for unclassifiable content
- [ ] 8.2.6 Implement --dry-run flag for preview mode
- [ ] 8.3 Implement `status` command - Show current configuration mode
- [ ] 8.4 Implement `diff` command - Compare original and evolved configs
- [ ] 8.5 Implement `switch --enable` command - Enable evolved configuration
- [ ] 8.6 Implement `switch --disable` command - Restore original configuration
- [ ] 8.7 Implement `analyze` command - Trigger manual analysis
- [ ] 8.8 Implement `history` command - Display evolution log
- [ ] 8.9 Implement `review` command - Show pending suggestions
- [ ] 8.10 Implement `approve <id>` command - Approve suggestion
- [ ] 8.11 Implement `reject <id>` command - Reject suggestion
- [ ] 8.12 Implement `rollback --to-original` command - Restore initial backup
- [ ] 8.13 Implement `rollback --list` command - List available backups
- [ ] 8.14 Implement `operations` command - View file operation history
- [ ] 8.15 Implement `reset` command - Clear all learned data
- [ ] 8.16 Add pretty table formatting for CLI output
- [ ] 8.17 Write CLI integration tests
- [ ] 8.18 Write E2E test for safe migration flow

## 9. Configuration Management

- [ ] 9.1 Create src/config/schema.ts - Zod schema for config validation
- [ ] 9.2 Implement config loader from ~/.claude-evolution/config.json
- [ ] 9.3 Add default config generator on first run
- [ ] 9.4 Implement config update mechanism
- [ ] 9.5 Add validation for user-provided config
- [ ] 9.6 Create evolution-log.json structure and writer
- [ ] 9.7 Implement log rotation (keep last 30 days)
- [ ] 9.8 Write tests for config management

## 10. Error Handling and Logging

- [ ] 10.1 Setup logging library (winston or pino)
- [ ] 10.2 Create log directory at ~/.claude-evolution/logs/
- [ ] 10.3 Implement structured error logging
- [ ] 10.4 Add operation audit trail to operations.log
- [ ] 10.4.1 Log all file operations (backup, switch, restore, delete)
- [ ] 10.4.2 Include timestamp, operation type, files affected, user, status
- [ ] 10.4.3 Implement operations.log reader for CLI display
- [ ] 10.5 Add evolution-log.json for learning events
- [ ] 10.6 Implement graceful degradation when MCP unavailable
- [ ] 10.7 Add user-facing error messages with suggestions
- [ ] 10.8 Write error handling tests

## 11. Initial Templates and Documentation

- [ ] 11.1 Create default CORE.md template
- [ ] 11.2 Create default STYLE.md template
- [ ] 11.3 Create default CODING.md template
- [ ] 11.4 Write README.md with installation and usage
- [ ] 11.5 Create CONTRIBUTING.md
- [ ] 11.6 Write architectural documentation
- [ ] 11.7 Add example config.json with comments
- [ ] 11.8 Create troubleshooting guide

## 12. Integration and E2E Testing

- [ ] 12.1 Write integration test: Full analysis pipeline
- [ ] 12.2 Write integration test: Config generation and assembly
- [ ] 12.3 Write E2E test: Init → Analyze → Review → Approve flow
- [ ] 12.4 Write E2E test: Safe migration with existing config
- [ ] 12.4.1 Test Option A: Import existing config and intelligent split
- [ ] 12.4.2 Test Option B: Independent mode without modification
- [ ] 12.4.3 Test Option C: Cancel installation and cleanup
- [ ] 12.4.4 Test switch --enable and --disable flow
- [ ] 12.4.5 Test rollback --to-original restoration
- [ ] 12.5 Write E2E test: Rollback and reset functionality
- [ ] 12.6 Write E2E test: Backup creation and restoration
- [ ] 12.7 Add CI pipeline configuration (GitHub Actions)
- [ ] 12.8 Setup test coverage reporting
- [ ] 12.9 Verify compatibility with Claude Code

## 13. Performance Optimization

- [ ] 13.1 Implement prompt caching for repeated LLM calls
- [ ] 13.2 Add incremental processing (only analyze new sessions)
- [ ] 13.3 Optimize MCP queries (batch requests where possible)
- [ ] 13.4 Add memory limit checks and cleanup
- [ ] 13.5 Profile and optimize hot paths
- [ ] 13.6 Add performance metrics logging

## 14. Security and Privacy

- [ ] 14.1 Implement API key regex patterns for sensitive data filtering
- [ ] 14.2 Add password pattern detection
- [ ] 14.3 Implement user-configurable blacklist
- [ ] 14.4 Add opt-out mechanism for specific sessions
- [ ] 14.5 Ensure no data leaves localhost except LLM API calls
- [ ] 14.6 Add security audit log
- [ ] 14.7 Write security-focused tests

## 15. Packaging and Distribution

- [ ] 15.1 Configure package.json for npm publishing
- [ ] 15.2 Add bin entry for global CLI installation
- [ ] 15.3 Create installation script (post-install hook)
- [ ] 15.4 Test installation via `npm install -g`
- [ ] 15.5 Add update checker for new versions
- [ ] 15.6 Create release workflow
- [ ] 15.7 Write migration guide for updates
