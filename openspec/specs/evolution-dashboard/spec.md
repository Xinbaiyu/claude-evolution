# evolution-dashboard Specification

## Purpose
TBD - created by archiving change claude-code-evolution-system. Update Purpose after archive.
## Requirements
### Requirement: Safe initialization with existing configuration protection

The system SHALL detect and safely handle existing CLAUDE.md configuration during initialization, providing multiple options to prevent data loss.

#### Scenario: Detect existing configuration
- **WHEN** user runs `claude-evolution init` and `~/.claude/CLAUDE.md` exists
- **THEN** the system displays a warning message showing the file size and modification date

#### Scenario: Create permanent backup
- **WHEN** user chooses to proceed with initialization and existing CLAUDE.md is detected
- **THEN** the system creates a permanent backup at `~/.claude/CLAUDE.md.backup-YYYY-MM-DD-HH-mm-ss` before any modifications

#### Scenario: Offer migration options
- **WHEN** existing CLAUDE.md is detected
- **THEN** the system presents three options:
  - Option A: Import existing configuration (recommended)
  - Option B: Keep original configuration (independent mode)
  - Option C: Cancel installation

#### Scenario: Import existing configuration (Option A)
- **WHEN** user selects "Import existing configuration"
- **THEN** the system SHALL:
  - Parse the existing CLAUDE.md content
  - Attempt to intelligently split it into source/CORE.md, source/STYLE.md, source/CODING.md
  - Save any unclassifiable content to source/UNMAPPED.md
  - Display a summary of what was imported and what needs manual review
  - Ask whether to switch immediately or later

#### Scenario: Independent mode (Option B)
- **WHEN** user selects "Keep original configuration"
- **THEN** the system SHALL:
  - Leave `~/.claude/CLAUDE.md` untouched
  - Create `~/.claude-evolution/` directory structure
  - Generate configuration in `~/.claude-evolution/output/CLAUDE.md`
  - Display instructions for manual switching later

#### Scenario: Cancel installation (Option C)
- **WHEN** user selects "Cancel installation"
- **THEN** the system SHALL:
  - Clean up any created files
  - Exit without making any modifications
  - Display message confirming no changes were made

#### Scenario: Dry-run mode
- **WHEN** user runs `claude-evolution init --dry-run`
- **THEN** the system displays all actions it would take without actually executing them

### Requirement: Configuration switching and rollback

The system SHALL provide safe switching between original and evolved configurations with full rollback support.

#### Scenario: Check current status
- **WHEN** user runs `claude-evolution status`
- **THEN** the system displays:
  - Current mode (original, independent, or switched)
  - Path to active CLAUDE.md
  - Path to backup files
  - Available actions

#### Scenario: Compare configurations
- **WHEN** user runs `claude-evolution diff`
- **THEN** the system displays a diff between `~/.claude/CLAUDE.md` and `~/.claude-evolution/output/CLAUDE.md`

#### Scenario: Enable evolved configuration
- **WHEN** user runs `claude-evolution switch --enable` in independent mode
- **THEN** the system SHALL:
  - Create a backup of current `~/.claude/CLAUDE.md`
  - Remove the existing CLAUDE.md
  - Create a symlink from `~/.claude/CLAUDE.md` to `~/.claude-evolution/output/CLAUDE.md`
  - Log the operation with timestamp
  - Display success message with rollback instructions

#### Scenario: Disable evolved configuration
- **WHEN** user runs `claude-evolution switch --disable` in switched mode
- **THEN** the system SHALL:
  - Remove the symlink at `~/.claude/CLAUDE.md`
  - Restore the original CLAUDE.md from backup
  - Log the operation with timestamp
  - Display success message confirming restoration

#### Scenario: Rollback to original
- **WHEN** user runs `claude-evolution rollback --to-original`
- **THEN** the system SHALL:
  - Restore the initial backup created during installation
  - Remove any symlinks
  - Display confirmation of restoration

#### Scenario: List available backups
- **WHEN** user runs `claude-evolution rollback --list`
- **THEN** the system displays all available backup files with dates and sizes

### Requirement: Operation logging and auditability

The system SHALL maintain a comprehensive log of all configuration modifications for transparency and debugging.

#### Scenario: Log all file operations
- **WHEN** any file operation occurs (backup, switch, restore, delete)
- **THEN** the system SHALL append an entry to `~/.claude-evolution/operations.log` with:
  - Timestamp
  - Operation type
  - Files affected
  - User who initiated
  - Success or failure status

#### Scenario: View operation history
- **WHEN** user runs `claude-evolution operations`
- **THEN** the system displays recent file operations in chronological order

### Requirement: Display evolution history

The system SHALL provide a command to view all learning events and configuration changes.

#### Scenario: List recent changes
- **WHEN** user runs `claude-evolution history`
- **THEN** the system displays a table of recent learning events with timestamps, types, and confidence scores

#### Scenario: View specific change details
- **WHEN** user runs `claude-evolution history --id <id>`
- **THEN** the system shows full details including extracted data, applied changes, and rollback command

#### Scenario: Filter by type
- **WHEN** user runs `claude-evolution history --type preference`
- **THEN** the system shows only preference-learning events

### Requirement: Allow manual review and approval

The system SHALL provide commands for users to review and approve pending suggestions.

#### Scenario: Review pending suggestions
- **WHEN** user runs `claude-evolution review`
- **THEN** the system displays all pending (unapproved) suggestions with confidence scores

#### Scenario: Approve suggestion
- **WHEN** user runs `claude-evolution approve <id>`
- **THEN** the system applies the suggestion and regenerates CLAUDE.md

#### Scenario: Reject suggestion
- **WHEN** user runs `claude-evolution reject <id>`
- **THEN** the system marks suggestion as rejected and excludes from future consideration

### Requirement: Page components receive navigation context from router

Each page component SHALL access route information (current path, params, navigation functions) through React Router hooks instead of receiving props from a parent switch statement.

#### Scenario: Page component uses route hooks
- **WHEN** a page component (e.g., Dashboard) needs to know the current route
- **THEN** it SHALL use `useLocation()` or `useParams()` from `react-router` instead of relying on `window.location`

#### Scenario: Navigation component uses route context
- **WHEN** the Navigation component determines the active page
- **THEN** it SHALL derive the active state from React Router's `<NavLink>` `isActive` callback instead of receiving a `currentPage` prop

### Requirement: Restore analysis loading state on page load

ManualAnalysisTrigger 组件 SHALL 在挂载时自动检查后台分析运行状态，若后台正在分析则恢复 loading UI（包括 spinner、禁用按钮、经过时间计时器）。

#### Scenario: Page loads while analysis is running
- **WHEN** 用户访问或刷新 Dashboard 页面且后台正在执行分析
- **THEN** ManualAnalysisTrigger 组件 SHALL 自动显示 loading 状态，包括：
  - 按钮显示为禁用状态
  - 显示 spinner 动画
  - 显示从后端 `startTime` 计算的真实经过时间

#### Scenario: Page loads when no analysis is running
- **WHEN** 用户访问或刷新 Dashboard 页面且后台没有正在执行的分析
- **THEN** ManualAnalysisTrigger 组件 SHALL 显示正常的空闲按钮状态

#### Scenario: Analysis completes after page reload
- **WHEN** 用户刷新页面后恢复了 loading 状态，且后台分析随后完成
- **THEN** 组件 SHALL 通过已有的 WebSocket `analysis_complete` 事件正常清除 loading 状态

### Requirement: API client method for analysis status

前端 API client SHALL 提供 `getAnalysisStatus()` 方法，调用 `GET /api/analyze/status` 并返回类型化的响应对象。

#### Scenario: Successful status query
- **WHEN** 调用 `apiClient.getAnalysisStatus()`
- **THEN** 返回 `{ isRunning: boolean, startTime: string | null, runId: string | null }` 类型的对象

#### Scenario: Network error during status query
- **WHEN** 调用 `apiClient.getAnalysisStatus()` 但网络请求失败
- **THEN** SHALL 默认返回 `{ isRunning: false, startTime: null, runId: null }`，不抛出异常（静默降级）

### Requirement: 看板页面展示 ECharts 数据可视化图表

Dashboard 页面 SHALL 在核心指标行下方展示数据可视化图表区域，包含分析趋势图、观察类型分布图和置信度仪表盘。

#### Scenario: 看板加载时获取图表数据
- **WHEN** Dashboard 页面挂载
- **THEN** SHALL 调用 `apiClient.getStatsOverview()` 获取图表数据
- **AND** 数据加载期间图表区域显示 skeleton 占位

#### Scenario: 图表区域布局
- **WHEN** Dashboard 页面渲染完成且数据加载成功
- **THEN** 指标行下方 SHALL 显示两栏图表布局：
  - 左侧占 2/3 宽度：分析趋势面积图
  - 右侧占 1/3 宽度：观察类型环形图（上）+ 置信度仪表盘（下）

#### Scenario: 图表数据请求失败
- **WHEN** `getStatsOverview()` 请求失败
- **THEN** 图表区域 SHALL 显示简洁的错误提示，不阻塞页面其他内容

### Requirement: 看板布局从双栏变为单栏三段式

Dashboard 页面 SHALL 从当前的 "左主内容 + 右侧边栏" 双栏布局变为单栏三段式布局：指标行、图表区、操作区。

#### Scenario: 近期分析记录移至底部
- **WHEN** Dashboard 页面渲染
- **THEN** RecentAnalysisWidget SHALL 从右侧侧边栏移至页面底部操作区域
- **AND** 与快捷操作按钮并排显示

#### Scenario: 页面内容流
- **WHEN** 用户查看 Dashboard 页面
- **THEN** 页面内容 SHALL 按以下顺序从上到下排列：
  1. 核心指标卡片行（保留现有 4 个指标）
  2. 数据可视化图表区（新增）
  3. 快捷操作 + 近期分析记录（合并后的底部区域）
  4. 系统信息 footer

