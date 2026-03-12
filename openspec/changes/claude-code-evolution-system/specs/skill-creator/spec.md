## ADDED Requirements

### Requirement: Generate skill from template

The system SHALL create skill files from predefined templates based on detected patterns.

#### Scenario: Command skill generation
- **WHEN** creating a command-type skill
- **THEN** the system generates SKILL.md with command sequence and description

#### Scenario: Script skill generation
- **WHEN** creating a script-type skill
- **THEN** the system generates SKILL.md plus scripts/ directory with executable

#### Scenario: Workflow skill generation
- **WHEN** creating a workflow-type skill
- **THEN** the system generates SKILL.md with multi-step instructions and conditionals
