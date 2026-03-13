# claude-evolution - 功能清单

**版本**: v0.1.0
**更新时间**: 2026-03-13

---

## 🎯 项目概述

claude-evolution 是一个自动进化系统，能够从 Claude Code 的历史会话中学习用户的工作偏好、问题解决模式和工作流程，并自动生成建议来优化 CLAUDE.md 配置文件。

**核心理念**:
- 📊 **自动分析**: 自动分析 Claude Code 会话历史
- 🧠 **智能学习**: 使用 LLM 提取偏好、模式和工作流
- ✅ **人工审核**: 生成建议后需人工审批
- 🔄 **持续进化**: 配置文件随着使用不断优化

---

## ✅ 已实现功能

### 1. CLI 工具 (7/10 命令)

| 命令 | 状态 | 说明 |
|------|------|------|
| `claude-evolution init` | ✅ | 初始化配置目录和文件结构 |
| `claude-evolution analyze [--now]` | ✅ | 手动触发会话分析（可选立即执行） |
| `claude-evolution review [-v]` | ✅ | 查看待审批建议（支持详细模式） |
| `claude-evolution approve <id\|all>` | ✅ | 批准单个或所有建议 |
| `claude-evolution reject <id>` | ✅ | 拒绝单个建议 |
| `claude-evolution config list` | ✅ | 列出当前配置 |
| `claude-evolution config set <key> <value>` | ✅ | 设置配置项 |
| `claude-evolution status` | ❌ | 显示系统状态 |
| `claude-evolution history` | ❌ | 查看历史记录 |
| `claude-evolution diff` | ❌ | 查看配置差异 |

#### 功能详情

**`init` - 初始化**
- 创建 `~/.claude-evolution/` 目录结构
- 生成默认配置文件 `config.yaml`
- 创建建议存储目录 `suggestions/`
- 生成初始 CLAUDE.md

**`analyze` - 分析会话**
- 收集 Claude Code 会话历史
- 使用 LLM 提取偏好、模式、工作流
- 生成待审批建议
- 支持 `--now` 立即执行（绕过定时任务）

**`review` - 查看建议**
- 显示待审批建议列表
- 支持 `-v/--verbose` 显示详细信息：
  - 完整建议 ID
  - 创建时间
  - 证据引用 (evidence)
  - Workflow 完整步骤

**`approve` - 批准建议**
- 批准单个建议: `approve <id>`
- 批准所有建议: `approve all`
- 自动更新 CLAUDE.md
- 移动到 `approved.json`

**`reject` - 拒绝建议**
- 拒绝单个建议
- 移动到 `rejected.json`

**`config` - 配置管理**
- `config list`: 显示当前所有配置
- `config set <key> <value>`: 修改配置项
  - `analysisInterval`: 分析间隔 (如 "12h", "1d")
  - `confidenceThreshold`: 置信度阈值 (0-1)
  - `maxSuggestions`: 最大建议数

---

### 2. Web UI (4 个页面)

| 页面 | 路径 | 功能 |
|------|------|------|
| Dashboard | `/` | 系统概览、统计数据 |
| Review | `/review` | 建议列表、批量操作 |
| Settings | `/settings` | 配置管理 |
| BatchApprovalModal | (组件) | 批量批准进度弹窗 |

#### 功能详情

**Dashboard (仪表盘)**
- 待审批建议数量
- 已批准/已拒绝统计
- 最近分析时间
- 系统健康状态

**Review (审批页面)**
- 建议列表展示
- 批量选择 (多选框)
- 批量批准/拒绝
- 单个批准/拒绝
- 详细信息展示
- 实时进度弹窗

**Settings (设置页面)**
- 修改分析间隔
- 修改置信度阈值
- 修改最大建议数
- 启用/禁用自动分析

**BatchApprovalModal (批量批准弹窗)**
- 实时显示批准进度
- 成功/失败统计
- 错误信息展示
- 自动关闭（成功后 2 秒）

---

### 3. REST API (7 个端点)

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/suggestions` | GET | 获取建议列表 (支持 `?status=pending`) |
| `/api/suggestions/:id` | GET | 获取单个建议详情 |
| `/api/suggestions/:id/approve` | POST | 批准单个建议 |
| `/api/suggestions/:id/reject` | POST | 拒绝单个建议 |
| `/api/suggestions/batch/approve` | POST | 批量批准建议 |
| `/api/suggestions/batch/reject` | POST | 批量拒绝建议 |
| `/api/system/status` | GET | 获取系统状态 |

#### API 特性

- ✅ RESTful 设计
- ✅ JSON 响应格式
- ✅ 错误处理
- ✅ WebSocket 实时推送（批准/拒绝事件）
- ✅ CORS 支持

---

### 4. 核心模块

| 模块 | 文件 | 功能 |
|------|------|------|
| Session Collector | `session-collector.ts` | 收集 Claude Code 会话历史 |
| Experience Extractor | `experience-extractor.ts` | 使用 LLM 提取偏好/模式/工作流 |
| Preference Learner | `preference-learner.ts` | 学习用户偏好，计算置信度 |
| Suggestion Manager | `suggestion-manager.ts` | 管理建议的 CRUD 和批准/拒绝 |
| MD Generator | `md-generator.ts` | 生成和更新 CLAUDE.md |
| Cron Scheduler | `cron-scheduler.ts` | 定时触发分析任务 |
| File Watcher | `file-watcher.ts` | 监听文件变化，自动同步 |

#### 模块详情

**Session Collector (会话收集器)**
- 扫描 `~/.claude/projects/` 目录
- 读取 `.jsonl` 格式的会话文件
- 过滤最近 N 天的会话
- 去重和清洗数据

**Experience Extractor (经验提取器)**
- 使用 Anthropic SDK 调用 LLM
- 批量处理会话数据
- 提取三类信息:
  1. **Preferences** (偏好): 用户的工作习惯
  2. **Patterns** (模式): 重复出现的问题-解决方案
  3. **Workflows** (工作流): 常见操作序列
- JSON Schema 验证输出
- 错误重试机制

**Preference Learner (偏好学习器)**
- 合并相似偏好
- 统计频率 (frequency)
- 计算置信度 (confidence)
- 检测冲突偏好
- 生成低置信度建议

**Suggestion Manager (建议管理器)**
- 加载/保存建议 (`pending.json`)
- 批准建议 (`approved.json`)
- 拒绝建议 (`rejected.json`)
- 批量操作支持
- 事务回滚 (批量操作)
- 调用 MD Generator 更新配置

**MD Generator (Markdown 生成器)**
- 读取 `source/` 目录的静态规则
- 读取 `learned/` 目录的学习内容
- 合并生成 `~/.claude/CLAUDE.md`
- 格式化输出
- 添加元数据（生成时间、版本）

**Cron Scheduler (定时调度器)**
- 使用 `node-cron` 实现
- 支持 cron 表达式 (如 `0 */12 * * *`)
- 管理任务状态 (`state.json`)
- 记录上次执行时间
- 防止重复执行

**File Watcher (文件监听器)**
- 使用 `chokidar` 监听文件变化
- 监听 `source/` 和 `learned/` 目录
- 自动触发 CLAUDE.md 重新生成
- 支持启用/禁用

---

### 5. 数据结构

#### Preference (偏好)

```typescript
interface Preference {
  type: 'workflow' | 'style' | 'tool' | 'communication';
  description: string;
  confidence: number; // 0-1
  frequency: number;  // 出现次数
  evidence: string[]; // 引用的 session/observation
}
```

#### Pattern (模式)

```typescript
interface Pattern {
  problem: string;
  solution: string;
  confidence: number;
  occurrences: number; // 出现次数
  evidence: string[];
}
```

#### Workflow (工作流)

```typescript
interface Workflow {
  name: string;
  steps: string[];
  confidence: number;
  frequency: number;
  evidence: string[];
}
```

#### Suggestion (建议)

```typescript
interface Suggestion {
  id: string;
  type: 'preference' | 'pattern' | 'workflow';
  item: Preference | Pattern | Workflow;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}
```

---

### 6. 配置系统

#### 配置文件位置

- **用户配置**: `~/.claude-evolution/config.yaml`
- **建议存储**: `~/.claude-evolution/suggestions/`
  - `pending.json` - 待审批
  - `approved.json` - 已批准
  - `rejected.json` - 已拒绝
- **静态规则**: `~/.claude-evolution/source/`
- **学习内容**: `~/.claude-evolution/learned/`
- **生成配置**: `~/.claude/CLAUDE.md`

#### 可配置项

```yaml
analysisInterval: "12h"        # 分析间隔
confidenceThreshold: 0.8       # 置信度阈值
maxSuggestions: 50             # 最大建议数
enabledFeatures:
  sessionAnalysis: true        # 启用会话分析
  preferLearning: true         # 启用偏好学习
  autoApprove: false           # 自动批准（默认关闭）
```

---

## ❌ 未实现功能

### 1. CLI 命令缺失

**`status` - 系统状态**
```bash
claude-evolution status

# 预期输出:
System Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Configuration: Enabled
✓ Last Analysis: 2 hours ago
✓ Pending Suggestions: 5
✓ Health Check: OK
```

**`history` - 历史记录**
```bash
claude-evolution history [--limit 10] [--type approved|rejected]

# 预期输出:
Recent History
━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID          Type        Action    Time
abc123      preference  approved  2h ago
def456      workflow    rejected  5h ago
```

**`diff` - 配置差异**
```bash
claude-evolution diff [--no-color]

# 预期输出:
Configuration Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━
+ 新增: 使用中文编写文档
- 删除: 使用 console.log 调试
~ 修改: 提交信息格式
```

---

### 2. 高级功能

**自动批准 (Auto-Approve)**
- 根据置信度自动批准高质量建议
- 可配置阈值 (如 confidence > 0.9)
- 需要用户显式启用

**冲突检测增强**
- 检测矛盾的偏好
- 提示用户解决冲突
- 建议保留哪个偏好

**建议合并**
- 合并相似建议
- 去重优化
- 减少审批负担

**版本管理**
- CLAUDE.md 版本历史
- 回滚到历史版本
- 差异比较

**导出/导入**
- 导出学习的偏好
- 分享给团队成员
- 导入他人的配置

**智能推荐**
- 基于上下文推荐相关建议
- 基于项目类型推荐配置
- 基于团队习惯推荐最佳实践

---

### 3. 集成功能

**MCP Server 集成**
- 作为 MCP Server 运行
- 提供工具给 Claude Code 调用
- 实时查询建议状态

**Git Hooks 集成**
- Pre-commit 检查
- 自动生成 commit message
- 基于学习的 commit 规范

**IDE 集成**
- VSCode 插件
- Zed 集成
- 实时建议提示

**通知系统增强**
- 桌面通知 (已有基础)
- Email 通知
- Slack 通知
- 自定义 Webhook

---

### 4. 可视化增强

**Web UI 增强**
- 图表展示偏好分布
- 时间线展示学习历史
- 置信度可视化
- 证据链追踪

**Dashboard 增强**
- 学习进度图表
- 建议趋势分析
- 热力图 (偏好类型分布)
- 健康评分

**Analytics (分析)**
- 学习效率统计
- 建议质量评估
- 用户行为分析
- A/B 测试支持

---

## 🧪 测试现状

| 模块 | 单元测试 | 集成测试 | E2E 测试 | 覆盖率 |
|------|----------|----------|----------|--------|
| suggestion-manager | ✅ 15 个 | ❌ | ❌ | 34.79% |
| preference-learner | ❌ | ❌ | ❌ | 0% |
| experience-extractor | ❌ | ❌ | ❌ | 0% |
| CLI 命令 | ❌ | ❌ | ❌ | 0% |
| Web API | ❌ | ❌ | ❌ | N/A |
| **总体** | **15** | **0** | **0** | **6.86%** |

**目标**: 80% 覆盖率
**现状**: 6.86%
**差距**: -73.14%

---

## 📚 文档现状

| 文档 | 状态 | 位置 |
|------|------|------|
| README.md | ⚠️ 简陋 | `/README.md` |
| ARCHITECTURE.md | ❌ 缺失 | - |
| API.md | ❌ 缺失 | - |
| DEPLOYMENT.md | ❌ 缺失 | - |
| CLI_REFERENCE.md | ❌ 缺失 | - |
| CONTRIBUTING.md | ❌ 缺失 | - |
| CHANGELOG.md | ❌ 缺失 | - |

---

## 🚀 技术栈

### 后端
- **Runtime**: Node.js 22+
- **语言**: TypeScript 5.7
- **框架**: Express.js
- **AI SDK**: @anthropic-ai/sdk
- **定时任务**: node-cron
- **文件监听**: chokidar
- **数据验证**: zod
- **测试**: Vitest
- **构建**: tsc

### 前端
- **框架**: React 18
- **构建**: Vite
- **UI**: TailwindCSS
- **路由**: React Router
- **HTTP**: Fetch API
- **实时通信**: WebSocket

### 工具链
- **包管理**: npm
- **代码规范**: (未配置 ESLint)
- **格式化**: (未配置 Prettier)
- **Git Hooks**: (未配置)
- **CI/CD**: (未配置)

---

## 🎯 下一步建议

### 立即执行 (本周)

1. **补充核心模块单元测试** ⭐⭐⭐
   - `preference-learner.ts`
   - `experience-extractor.ts`
   - 目标: 覆盖率达到 40%+

2. **实现 `status` 命令** ⭐⭐
   - 快速实现 (2-3 小时)
   - 高价值 (用户常用)

### 短期规划 (下周)

3. **CLI 集成测试** ⭐⭐⭐
   - 验证完整工作流
   - 端到端测试

4. **实现 `history` 和 `diff` 命令** ⭐⭐
   - 完善用户体验

### 中期规划 (两周内)

5. **完善文档** ⭐⭐
   - README, Architecture, API
   - 降低新用户上手门槛

6. **配置 CI/CD** ⭐⭐
   - GitHub Actions
   - 自动化测试

### 长期规划 (一个月内)

7. **高级功能开发** ⭐
   - 自动批准
   - 冲突检测
   - 建议合并

8. **集成功能** ⭐
   - MCP Server
   - Git Hooks
   - IDE 插件

---

## 📊 功能矩阵

| 功能领域 | 完成度 | 优先级 | 状态 |
|---------|--------|--------|------|
| **CLI 工具** | 70% | 高 | 🟡 进行中 |
| **Web UI** | 100% | 中 | ✅ 完成 |
| **REST API** | 100% | 中 | ✅ 完成 |
| **核心逻辑** | 100% | 高 | ✅ 完成 |
| **单元测试** | 10% | 高 | 🔴 严重不足 |
| **集成测试** | 0% | 高 | 🔴 未开始 |
| **文档** | 20% | 中 | 🔴 严重不足 |
| **CI/CD** | 0% | 中 | 🔴 未开始 |
| **高级功能** | 0% | 低 | ⏸️ 未规划 |

---

## 🎓 经验教训

### ✅ 做得好的地方

1. **模块化设计清晰**: 职责分离良好
2. **类型安全**: 使用 TypeScript 和 Zod 验证
3. **不可变数据**: 遵循函数式编程原则
4. **用户体验**: CLI 和 Web UI 双重支持

### ⚠️ 需要改进

1. **测试覆盖率极低**: 核心逻辑未充分验证
2. **文档不完整**: 新用户上手困难
3. **缺少 CI/CD**: 无自动化质量保障
4. **未采用 TDD**: 后期补测试成本高

### 💡 关键洞察

- **架构设计合理**: 核心功能已就位，易于扩展
- **测试债务严重**: 需要尽快补充，避免技术债累积
- **文档是软肋**: 影响项目推广和协作
- **基础功能完善**: 可以开始考虑高级特性

---

**文档维护者**: Claude Opus 4.6
**最后更新**: 2026-03-13T22:01:10+08:00
