## 1. Preparation

- [x] 1.1 Create backup of current README.md as README.md.backup
- [x] 1.2 Read current README.md to identify content for deletion and retention
- [x] 1.3 Extract Mermaid diagram requirements from design.md

## 2. Create New README Structure

- [x] 2.1 Create project header with badges (License, Node >=18, Coverage)
- [x] 2.2 Add one-line project description below header
- [x] 2.3 Create "🚀 Quick Start" section header

## 3. Quick Start Section

- [x] 3.1 Write "Prerequisites" subsection
  - Node.js >= 18
  - Claude Code installed
  - claude-mem Worker Service
  - ANTHROPIC_API_KEY environment variable
- [x] 3.2 Write "Installation" subsection with npm install command
- [x] 3.3 Write "Initialization" subsection
  - Add `claude-evolution init` command
  - Explain P0 configuration (LLM Provider selection)
  - Explain P1 configuration (scheduler + port with defaults)
  - Explain P2 configuration (advanced options in WebUI)
  - Add WebUI URL: http://localhost:10010/settings
- [x] 3.4 Write "Start Service" subsection with `claude-evolution start` command

## 4. System Architecture Section

- [x] 4.1 Create "🏗️ System Architecture" section header
- [x] 4.2 Add "Automatic Analysis Pipeline" subsection with Mermaid diagram
  - Diagram shows: Claude Code Sessions → Session Collector → Experience Extractor → Observation Pool → MD Generator → ~/.claude/CLAUDE.md
- [x] 4.3 Add "Core Components" subsection
  - Session Collector: Scans ~/.claude/projects/
  - Experience Extractor: LLM-driven knowledge extraction
  - Observation Pool: Three-tier storage (Active/Context/Archived)
  - MD Generator: Merges source/ + learned/ to generate final config

## 5. Detailed Documentation Section

- [x] 5.1 Create "📚 Detailed Documentation" section header
- [x] 5.2 Add introduction text guiding users to docs/ directory
- [x] 5.3 Add docs/ directory structure list
  - docs/CLI_REFERENCE.md: CLI command reference
  - docs/WEB_UI_GUIDE.md: Web UI usage guide
  - docs/CONFIGURATION.md: Configuration options
  - docs/TROUBLESHOOTING.md: Troubleshooting guide
  - docs/DEVELOPMENT.md: Development guide

## 6. Content Removal

- [x] 6.1 Remove "界面预览" (Interface Preview) section
- [x] 6.2 Remove "使用指南" (Usage Guide) section
- [x] 6.3 Remove "目录结构" (Directory Structure) section
- [x] 6.4 Remove "数据模型" (Data Models) section
- [x] 6.5 Remove "配置选项" (Configuration Options) detailed section
- [x] 6.6 Remove "CLI 命令参考" (CLI Commands Reference) section
- [x] 6.7 Remove "开发指南" (Development Guide) section
- [x] 6.8 Remove "测试覆盖" (Test Coverage) section
- [x] 6.9 Remove "故障排查" (Troubleshooting) section
- [x] 6.10 Remove "安全与隐私" (Security & Privacy) section
- [x] 6.11 Remove "版本历史与路线图" (Version History & Roadmap) section
- [x] 6.12 Remove "贡献指南" (Contribution Guide) section
- [x] 6.13 Remove "社区与支持" (Community & Support) section

## 7. Validation

- [x] 7.1 Verify README.md line count is between 200-300 lines (excluding blank lines)
- [x] 7.2 Test Mermaid diagram renders correctly on GitHub
- [x] 7.3 Verify all internal links are valid (no broken docs/ references)
- [x] 7.4 Verify badges display correctly

## 8. Documentation

- [x] 8.1 Update CHANGELOG.md with "README restructured" entry
- [x] 8.2 Add note in CHANGELOG about docs/ migration in future PR
- [x] 8.3 Verify backup file README.md.backup exists
