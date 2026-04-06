# readme-structure Specification

## Purpose
TBD - created by archiving change simplify-readme-focus-core. Update Purpose after archive.
## Requirements
### Requirement: README SHALL contain exactly 4 core sections
The README.md SHALL be restructured to contain exactly 4 core sections in the following order: Project Header, Quick Start, System Architecture, and Detailed Documentation.

#### Scenario: New user reads README
- **WHEN** a new user opens README.md
- **THEN** they SHALL see project header with badges and one-line description at the top
- **THEN** they SHALL see Quick Start section immediately following the header
- **THEN** they SHALL see System Architecture section after Quick Start
- **THEN** they SHALL see Detailed Documentation section at the end

### Requirement: Quick Start section SHALL include initialization steps
The Quick Start section SHALL provide step-by-step initialization instructions including prerequisites, installation, and P0/P1/P2 configuration guidance.

#### Scenario: User initializes project successfully
- **WHEN** user follows Quick Start instructions
- **THEN** they SHALL be able to install the package via npm
- **THEN** they SHALL be able to run `claude-evolution init` command
- **THEN** they SHALL understand P0 configuration (LLM Provider) is required
- **THEN** they SHALL understand P1 configuration (scheduler/port) has defaults
- **THEN** they SHALL know P2 configuration is done in WebUI at http://localhost:10010/settings

#### Scenario: User understands prerequisites
- **WHEN** user reads Prerequisites subsection
- **THEN** they SHALL see Node.js >= 18 requirement
- **THEN** they SHALL see Claude Code requirement
- **THEN** they SHALL see claude-mem Worker Service requirement
- **THEN** they SHALL see ANTHROPIC_API_KEY requirement

### Requirement: System Architecture section SHALL use Mermaid diagram
The System Architecture section SHALL include a Mermaid flowchart showing the automatic analysis pipeline from sessions to CLAUDE.md.

#### Scenario: User understands analysis flow
- **WHEN** user views System Architecture section
- **THEN** they SHALL see a Mermaid diagram with 5 core components
- **THEN** the diagram SHALL show data flow from Claude Code Sessions to CLAUDE.md
- **THEN** component names SHALL match: Session Collector, Experience Extractor, Observation Pool, MD Generator

#### Scenario: User understands core components
- **WHEN** user reads Core Components subsection
- **THEN** they SHALL see descriptions of Session Collector
- **THEN** they SHALL see descriptions of Experience Extractor
- **THEN** they SHALL see descriptions of Observation Pool (Active/Context/Archived)
- **THEN** they SHALL see descriptions of MD Generator

### Requirement: README SHALL NOT contain removed content
The README.md SHALL NOT include CLI command details (except init), Web UI usage, development guides, troubleshooting, configuration details, API reference, roadmap, or contribution guidelines.

#### Scenario: User seeks detailed documentation
- **WHEN** user looks for CLI command reference in README
- **THEN** they SHALL NOT find it in README
- **THEN** they SHALL see a reference to docs/CLI_REFERENCE.md

#### Scenario: User seeks troubleshooting guide
- **WHEN** user looks for troubleshooting guide in README
- **THEN** they SHALL NOT find it in README
- **THEN** they SHALL see a reference to docs/TROUBLESHOOTING.md

### Requirement: Detailed Documentation section SHALL guide users to docs/
The Detailed Documentation section SHALL provide a clear directory structure showing where to find complete documentation.

#### Scenario: User navigates to detailed docs
- **WHEN** user reads Detailed Documentation section
- **THEN** they SHALL see a list of docs/ files with brief descriptions
- **THEN** they SHALL see links to docs/CLI_REFERENCE.md
- **THEN** they SHALL see links to docs/WEB_UI_GUIDE.md
- **THEN** they SHALL see links to docs/CONFIGURATION.md
- **THEN** they SHALL see links to docs/TROUBLESHOOTING.md
- **THEN** they SHALL see links to docs/DEVELOPMENT.md

### Requirement: README SHALL be 200-300 lines
The README.md total line count SHALL be between 200 and 300 lines (excluding blank lines).

#### Scenario: README length validation
- **WHEN** README.md is updated
- **THEN** the file SHALL contain no more than 300 non-blank lines
- **THEN** the file SHALL contain no fewer than 200 non-blank lines

### Requirement: Project header SHALL include essential badges
The project header SHALL include exactly 3 badges: License (MIT), Node version requirement (>=18), and Test Coverage.

#### Scenario: User views project status
- **WHEN** user views README header
- **THEN** they SHALL see MIT License badge
- **THEN** they SHALL see Node >=18 badge
- **THEN** they SHALL see Test Coverage badge
- **THEN** they SHALL NOT see TypeScript badge or other non-essential badges

