## ADDED Requirements

### Requirement: List source files
系统 SHALL 显示 `~/.claude-evolution/source/` 目录下的所有 `.md` 文件列表。

#### Scenario: Display all source files
- **WHEN** 用户访问 source manager 页面
- **THEN** 系统在左侧显示所有 source 目录下的 MD 文件名

#### Scenario: Handle empty directory
- **WHEN** source 目录为空或不存在
- **THEN** 系统显示提示信息 "暂无配置文件"

### Requirement: Select file for editing
用户 SHALL 能够点击文件名选择要编辑的文件。

#### Scenario: File selection
- **WHEN** 用户点击文件列表中的文件名
- **THEN** 系统在编辑器中加载并显示该文件的内容

#### Scenario: Visual feedback on selection
- **WHEN** 用户选中某个文件
- **THEN** 该文件在列表中显示高亮状态

### Requirement: Edit file content
系统 SHALL 提供 Markdown 编辑器供用户编辑文件内容。

#### Scenario: Edit content
- **WHEN** 用户在编辑器中修改文件内容
- **THEN** 编辑器实时响应用户输入

#### Scenario: Markdown syntax highlighting
- **WHEN** 用户编辑 Markdown 内容
- **THEN** 编辑器显示语法高亮

### Requirement: Save file changes
用户 SHALL 能够保存对文件的修改。

#### Scenario: Successful save
- **WHEN** 用户点击 "保存" 按钮
- **THEN** 系统将修改后的内容写入对应的 source 文件
- **AND** 系统显示保存成功提示

#### Scenario: Save triggers regeneration
- **WHEN** 文件保存成功
- **THEN** 系统自动调用 `generateCLAUDEmd()` 函数重新生成 CLAUDE.md
- **AND** 右侧预览区域自动刷新显示最新内容

#### Scenario: Save failure
- **WHEN** 保存过程中发生错误（如文件权限问题）
- **THEN** 系统显示错误提示并保留用户的编辑内容

### Requirement: Prevent accidental data loss
系统 SHALL 在用户未保存修改时切换文件或离开页面前进行提示。

#### Scenario: Unsaved changes warning
- **WHEN** 用户修改了文件但未保存，并尝试选择其他文件
- **THEN** 系统显示确认对话框 "当前文件有未保存的修改，是否放弃修改？"

#### Scenario: User confirms discard
- **WHEN** 用户在确认对话框中选择 "放弃"
- **THEN** 系统丢弃未保存的修改并加载新选择的文件

#### Scenario: User cancels navigation
- **WHEN** 用户在确认对话框中选择 "取消"
- **THEN** 系统保持当前文件编辑状态

### Requirement: API endpoint for file operations
系统 SHALL 提供后端 API 支持文件读取和保存操作。

#### Scenario: Get source files list
- **WHEN** 前端调用 `GET /api/source/files`
- **THEN** 系统返回 source 目录下的所有 MD 文件名列表

#### Scenario: Read file content
- **WHEN** 前端调用 `GET /api/source/files/:filename`
- **THEN** 系统返回指定文件的内容

#### Scenario: Update file content
- **WHEN** 前端调用 `PUT /api/source/files/:filename` 并传递新内容
- **THEN** 系统保存文件内容并触发 CLAUDE.md 重新生成
- **AND** 返回成功响应和重新生成的状态
