# memory-integration Specification

## Purpose
TBD - created by archiving change claude-code-evolution-system. Update Purpose after archive.
## Requirements
### Requirement: Query claude-mem for session data

The system SHALL use MCP protocol to retrieve session history from claude-mem.

#### Scenario: Time-range query
- **WHEN** requesting sessions since last analysis
- **THEN** the system calls mcp__plugin_claude-mem_mcp-search__search with date filters

#### Scenario: Semantic search
- **WHEN** searching for specific topics (e.g., "git workflow")
- **THEN** the system uses mcp__plugin_claude-mem_mcp-search__search with query parameter

#### Scenario: Get observation details
- **WHEN** retrieving full content of specific observations
- **THEN** the system calls mcp__plugin_claude-mem_mcp-search__get_observations with filtered IDs

