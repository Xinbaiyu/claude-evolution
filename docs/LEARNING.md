# Incremental Learning System

> **claude-evolution** 的自动学习引擎：从会话历史中持续学习，智能管理观察候选池

---

## 📖 目录

- [系统概述](#系统概述)
- [核心概念](#核心概念)
- [三层存储架构](#三层存储架构)
- [时间衰减算法](#时间衰减算法)
- [LLM 智能合并](#llm-智能合并)
- [自动提升机制](#自动提升机制)
- [容量控制策略](#容量控制策略)
- [配置调优指南](#配置调优指南)
- [WebUI 使用指南](#webui-使用指南)
- [故障排查](#故障排查)

---

## 系统概述

**Incremental Learning System** 是 claude-evolution v0.3.0 引入的核心功能，旨在解决传统建议审批流程的两大痛点：

### 问题背景

**v0.2.x 的限制**：
- ❌ **所有建议都需要人工审批** - 即使是明显正确的高频模式
- ❌ **无法处理重复建议** - 相同偏好在多个会话中重复提取
- ❌ **缺少置信度演进** - 无法根据时间和证据调整建议质量

**v0.3.0 的解决方案**：
- ✅ **自动管理观察候选池** - 高质量观察自动提升到 CLAUDE.md
- ✅ **智能去重和合并** - LLM 识别语义相似的观察并合并
- ✅ **时间衰减机制** - 老旧观察自动降低置信度或删除
- ✅ **容量控制** - 保持候选池在最优大小（默认 50 条）

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code Sessions                    │
│                  (用户与 Claude 的交互历史)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ claude-evolution analyze
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Experience Extractor (分析引擎)               │
│  • 提取偏好 (Preferences)                                    │
│  • 识别模式 (Patterns)                                       │
│  • 总结工作流 (Workflows)                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 新观察 (New Observations)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            📦 Active Pool (活跃池 - active.json)            │
│  候选观察存储，等待积累证据和提升到上下文池                 │
│                                                              │
│  [观察 1] confidence: 0.65, mentions: 3, age: 5 days        │
│  [观察 2] confidence: 0.80, mentions: 7, age: 2 days  ⭐     │
│  [观察 3] confidence: 0.40, mentions: 1, age: 45 days ⚠️     │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  每 6 小时运行 (Scheduler Integration)      │           │
│  │  1️⃣ LLM Merge: 合并新观察 + 去重             │           │
│  │  2️⃣ Temporal Decay: 根据时间调整置信度       │           │
│  │  3️⃣ Auto-Promotion: 高质量观察自动提升       │           │
│  │  4️⃣ Deletion: 删除低质量观察                 │           │
│  │  5️⃣ Capacity Control: 保持池大小 ≤ 50       │           │
│  └──────────────────────────────────────────────┘           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Auto-Promote (confidence≥75%, mentions≥5)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          📚 Context Pool (上下文池 - context.json)          │
│  已验证的高质量观察，会写入最终 CLAUDE.md                   │
│                                                              │
│  [观察 A] confidence: 0.90, mentions: 12, inContext: true   │
│  [观察 B] confidence: 0.85, mentions: 8, inContext: true    │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  CLAUDE.md Generator                        │           │
│  │  自动生成最终配置文件                        │           │
│  └──────────────────────────────────────────────┘           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 ~/.claude-evolution/output/                 │
│                        CLAUDE.md                             │
│                 (Claude Code 最终配置文件)                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 降级/删除后进入归档
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         🗄️ Archived Pool (归档池 - archived.json)           │
│  已删除观察的备份，30 天后自动清理                           │
│                                                              │
│  [观察 X] archiveReason: capacity_control, expiresIn: 25d  │
│  [观察 Y] archiveReason: expired, expiresIn: 5d ⚠️          │
│                                                              │
│  用户可以通过 WebUI 恢复归档观察或永久删除                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心概念

### Observation（观察）

**定义**: 从会话中提取的单个知识单元，可能成为 CLAUDE.md 的一部分。

**类型**:
- **Preference（偏好）**: 用户的工作习惯或风格偏好
  - 示例: "优先使用 TypeScript 而不是 JavaScript"
- **Pattern（模式）**: 重复出现的问题-解决方案对
  - 示例: "使用 Zod 进行运行时类型验证"
- **Workflow（工作流）**: 多步骤操作序列
  - 示例: "提交前运行 `npm test` → `npm run build` → `git commit`"

### ObservationWithMetadata（观察元数据）

每个观察携带以下元数据：

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | string | 唯一标识符 (UUID v4) |
| `type` | enum | 观察类型 (preference/pattern/workflow) |
| `item` | object | 实际观察内容 |
| `confidence` | number | 当前置信度 (0.0-1.0) |
| `originalConfidence` | number | 初始置信度（不变） |
| `mentions` | number | 被引用次数（合并时累加） |
| `evidence` | string[] | 证据来源（会话 ID + 观察 ID） |
| `firstSeen` | string | 首次发现时间 (ISO 8601) |
| `lastSeen` | string | 最后更新时间 (ISO 8601) |
| `inContext` | boolean | 是否在上下文池中 |
| `manualOverride?` | object | 用户手动干预记录 |
| `mergedFrom?` | string[] | 合并来源观察 ID |
| `archiveReason?` | enum | 归档原因 (capacity_control/expired/user_deleted) |
| `archiveTimestamp?` | string | 归档时间 |

### Confidence（置信度）

**置信度** 是系统对观察质量的评估，范围 0.0-1.0：

- **0.0-0.25**: 低质量，即将删除
- **0.25-0.60**: 中等质量，需要更多证据
- **0.60-0.75**: 高质量，接近提升阈值
- **0.75-1.0**: 极高质量，符合自动提升条件

**影响因素**:
1. **初始置信度**: LLM 分析时给出（通常 0.6-0.9）
2. **时间衰减**: 随时间降低（半衰期默认 30 天）
3. **合并调整**: 合并多个观察时 LLM 重新评估
4. **提及次数**: 多次出现的观察更可信

---

## 三层存储架构

### 📦 Active Pool（活跃池）

**文件**: `~/.claude-evolution/memory/observations/active.json`

**用途**: 存储所有候选观察，等待积累证据和提升。

**特点**:
- 新观察首先进入此池
- 每 6 小时执行合并、衰减、提升、删除、容量控制
- 容量限制: 10-200（默认 50）

**示例数据**:
```json
[
  {
    "id": "obs-123abc",
    "type": "preference",
    "item": {
      "type": "Code Style",
      "description": "Always use const for immutable variables"
    },
    "confidence": 0.72,
    "originalConfidence": 0.80,
    "mentions": 4,
    "evidence": [
      "session-abc/obs-001",
      "session-def/obs-002"
    ],
    "firstSeen": "2026-03-01T10:00:00Z",
    "lastSeen": "2026-03-10T15:30:00Z",
    "inContext": false
  }
]
```

### 📚 Context Pool（上下文池）

**文件**: `~/.claude-evolution/memory/observations/context.json`

**用途**: 存储已验证的高质量观察，会写入 CLAUDE.md。

**特点**:
- 只有满足提升条件的观察才能进入
- 不受容量限制（可无限增长）
- `inContext: true` 标记

**自动提升条件**:
- **条件 1**: `confidence ≥ 0.75` AND `mentions ≥ 5`
- **条件 2**: `confidence ≥ 0.90` AND `mentions ≥ 3`（高置信度快速通道）

**手动提升**:
- WebUI 点击 "↑ Promote" 按钮
- CLI 命令: `claude-evolution promote <observation-id>`

### 🗄️ Archived Pool（归档池）

**文件**: `~/.claude-evolution/memory/observations/archived.json`

**用途**: 存储已删除观察的备份，支持恢复。

**归档原因**:
- `capacity_control`: 容量控制时淘汰
- `expired`: 置信度衰减到删除阈值
- `user_deleted`: 用户手动删除

**自动清理**:
- 默认保留 30 天（可配置）
- 超过保留期限的归档自动永久删除

**恢复操作**:
- WebUI 点击 "↻ Restore" 按钮
- 观察重新进入 Active Pool

---

## 时间衰减算法

### 原理

**时间衰减** 确保老旧观察逐渐失去影响力，避免过时信息污染配置文件。

**公式**:
```
衰减因子 = 0.5 ^ (天数 / 半衰期)
衰减后置信度 = 原始置信度 × 衰减因子
```

### 半衰期（Half-Life）

**定义**: 置信度衰减到原始值 50% 所需的天数。

**默认值**: 30 天

**示例计算**:

| 原始置信度 | 天数 | 半衰期 | 衰减因子 | 衰减后置信度 |
|-----------|------|--------|----------|-------------|
| 0.80 | 0 | 30 | 1.000 | 0.80 (100%) |
| 0.80 | 15 | 30 | 0.841 | 0.67 (84%) |
| 0.80 | 30 | 30 | 0.500 | 0.40 (50%) |
| 0.80 | 60 | 30 | 0.250 | 0.20 (25%) |
| 0.80 | 90 | 30 | 0.125 | 0.10 (13%) |

### 配置调整

**位置**: `~/.claude-evolution/config.json`

```json
{
  "learning": {
    "decay": {
      "enabled": true,
      "halfLifeDays": 30
    }
  }
}
```

**调整建议**:

| 工作模式 | 推荐半衰期 | 说明 |
|---------|-----------|------|
| 快速迭代 | 14-21 天 | 工作习惯变化快，快速淘汰旧观察 |
| 稳定项目 | 30-45 天 | 标准设置，平衡新旧观察 |
| 长期维护 | 60-90 天 | 工作模式稳定，保留历史观察 |

**禁用衰减**:
```json
{
  "learning": {
    "decay": {
      "enabled": false
    }
  }
}
```
⚠️ **不推荐**: 会导致过时观察永久保留，影响配置质量。

---

## LLM 智能合并

### 两阶段合并流程

#### Stage 1: 合并和去重

**目标**: 识别语义相似的观察并合并为一条。

**输入**:
- 活跃池中的现有观察（按置信度排序，取前 50）
- 本次分析的新观察（按置信度排序，取前 20）

**LLM 任务**:
1. 识别语义重复的观察
2. 合并相同/相似观察
3. 保留最具代表性的描述
4. 累加提及次数（mentions）
5. 合并证据列表（evidence）

**输出**: 去重后的观察列表（JSON 格式）

#### Stage 2: 置信度调整

**目标**: 根据合并情况重新评估置信度。

**输入**: Stage 1 输出的合并后观察

**LLM 任务**:
1. 评估合并后观察的质量
2. 根据证据数量和一致性调整置信度
3. 多证据支持的观察提高置信度
4. 单一来源的观察保持或降低置信度

**输出**: 带有更新置信度的观察列表

### 合并示例

**输入观察**:
```json
[
  {
    "id": "obs-001",
    "type": "preference",
    "item": {
      "type": "Code Style",
      "description": "Prefer const over let for immutable variables"
    },
    "confidence": 0.75,
    "mentions": 3
  },
  {
    "id": "obs-002",
    "type": "preference",
    "item": {
      "type": "Code Style",
      "description": "Always use const instead of let when variable won't be reassigned"
    },
    "confidence": 0.80,
    "mentions": 2
  }
]
```

**合并后输出**:
```json
[
  {
    "id": "obs-merged-001",
    "type": "preference",
    "item": {
      "type": "Code Style",
      "description": "Always use const for immutable variables (prefer const over let when variable won't be reassigned)"
    },
    "confidence": 0.85,
    "mentions": 5,
    "mergedFrom": ["obs-001", "obs-002"]
  }
]
```

### 合并质量保护

**问题**: LLM 可能过度激进，合并不相关的观察。

**保护机制**:
```typescript
const reductionPercentage =
  (oldCount - mergedCount) / oldCount * 100;

if (reductionPercentage > 50) {
  console.warn(
    `Merge reduced ${oldCount} → ${mergedCount} (${reductionPercentage}%). ` +
    `Possible over-merging detected.`
  );
}
```

**建议**: 如果发现合并后观察数量异常减少，检查 LLM 提示词或调整合并策略。

---

## 自动提升机制

### 分层系统

**三个层级**（Tiers）:

| 层级 | 条件 | 显示 | 说明 |
|------|------|------|------|
| 🥇 **Gold** | `confidence ≥ 0.75` AND `mentions ≥ 5` | 金色边框 | 自动提升候选 |
| 🥈 **Silver** | `confidence ≥ 0.60` AND `mentions ≥ 3` | 灰色边框 | 高优先级 |
| 🥉 **Bronze** | 低于 Silver 阈值 | 深灰边框 | 标准候选 |

### 自动提升规则

**双通道提升**:

1. **标准通道**:
   - `confidence ≥ 0.75` AND `mentions ≥ 5`
   - 适用于大多数观察

2. **快速通道**:
   - `confidence ≥ 0.90` AND `mentions ≥ 3`
   - 适用于极高质量观察

**提升效果**:
- 观察从 Active Pool 移动到 Context Pool
- 设置 `inContext: true`
- 触发 CLAUDE.md 重新生成

### 手动干预

**保护机制**: `manualOverride` 字段

**用途**:
- 用户手动提升的观察不会被自动降级
- 用户忽略的观察不会被自动提升或删除

**示例**:
```json
{
  "id": "obs-123",
  "manualOverride": {
    "action": "promote",
    "reason": "Critical workflow for team",
    "timestamp": "2026-03-15T10:00:00Z"
  },
  "inContext": true
}
```

### 配置调整

**位置**: `~/.claude-evolution/config.json`

```json
{
  "learning": {
    "promotion": {
      "auto": {
        "confidence": 0.75,
        "mentions": 5
      },
      "autoFast": {
        "confidence": 0.90,
        "mentions": 3
      }
    }
  }
}
```

**调整建议**:

| 场景 | 推荐配置 | 说明 |
|------|---------|------|
| 严格控制 | `confidence: 0.85, mentions: 7` | 只提升最高质量观察 |
| 标准模式 | `confidence: 0.75, mentions: 5` | 默认值，平衡质量和数量 |
| 宽松模式 | `confidence: 0.65, mentions: 3` | 快速积累上下文 |

---

## 容量控制策略

### 目标

保持 Active Pool 在最优大小，避免：
- ❌ 池过大 → LLM 合并成本高、处理慢
- ❌ 池过小 → 缺少多样性、淘汰过快

### 三层容量配置

```json
{
  "learning": {
    "capacity": {
      "targetSize": 50,
      "maxSize": 60,
      "minSize": 10
    }
  }
}
```

| 参数 | 默认值 | 说明 |
|------|-------|------|
| `targetSize` | 50 | 期望池大小，容量控制目标 |
| `maxSize` | 60 | 触发容量控制的阈值 |
| `minSize` | 10 | 最小池大小，低于此值不删除 |

### 淘汰算法

**评分公式**:
```
优先级得分 = confidence × mentions
```

**淘汰流程**:
```
1. 检查: current > maxSize? → NO → 跳过容量控制
2. 计算需要淘汰数量: pruneCount = current - targetSize
3. 保护: 跳过带有 manualOverride 的观察
4. 排序: 按优先级得分升序排列
5. 淘汰: 移除最低得分的 pruneCount 个观察
6. 归档: 淘汰的观察进入 Archived Pool
```

### 安全限制

**单次淘汰上限**: 30%

```typescript
const maxPrunePerCycle = Math.floor(observations.length * 0.3);
const actualPrune = Math.min(pruneCount, maxPrunePerCycle);
```

**目的**: 防止单次容量控制过于激进，保留观察多样性。

### 归档保留

**淘汰的观察不会立即删除**:
- 移动到 Archived Pool
- 设置 `archiveReason: 'capacity_control'`
- 保留 30 天（可配置）
- 用户可通过 WebUI 恢复

---

## 配置调优指南

### 完整配置示例

```json
{
  "learning": {
    "enabled": true,
    "capacity": {
      "targetSize": 50,
      "maxSize": 60,
      "minSize": 10
    },
    "decay": {
      "enabled": true,
      "halfLifeDays": 30
    },
    "promotion": {
      "auto": {
        "confidence": 0.75,
        "mentions": 5
      },
      "autoFast": {
        "confidence": 0.90,
        "mentions": 3
      }
    },
    "deletion": {
      "immediateThreshold": 0.25,
      "delayedThreshold": 0.40,
      "delayedDays": 14
    },
    "retention": {
      "archivedDays": 30
    }
  }
}
```

### 场景化调优

#### 场景 1: 快速迭代团队

**特点**: 工作模式变化快，需要快速淘汰过时观察。

```json
{
  "learning": {
    "decay": {
      "halfLifeDays": 14
    },
    "promotion": {
      "auto": {
        "confidence": 0.80,
        "mentions": 3
      }
    },
    "deletion": {
      "immediateThreshold": 0.30,
      "delayedDays": 7
    }
  }
}
```

#### 场景 2: 稳定项目维护

**特点**: 工作模式稳定，重视历史积累。

```json
{
  "learning": {
    "decay": {
      "halfLifeDays": 60
    },
    "promotion": {
      "auto": {
        "confidence": 0.70,
        "mentions": 7
      }
    },
    "capacity": {
      "targetSize": 80,
      "maxSize": 100
    }
  }
}
```

#### 场景 3: 个人使用（低频会话）

**特点**: 会话频率低，需要保留更长时间。

```json
{
  "learning": {
    "decay": {
      "halfLifeDays": 90
    },
    "promotion": {
      "auto": {
        "confidence": 0.65,
        "mentions": 2
      }
    },
    "deletion": {
      "delayedDays": 30
    }
  }
}
```

---

## WebUI 使用指南

### Learning Review 页面

**访问**: `http://localhost:10010/learning-review`

#### Tab 切换

**三个 Tab**:
- **活跃池 (Active)**: 候选观察，支持手动提升/删除
- **上下文池 (Context)**: 已提升观察，会写入 CLAUDE.md
- **归档池 (Archived)**: 已删除观察，支持恢复

#### 过滤器

**类型过滤**:
- All（全部）
- Preference（偏好）
- Pattern（模式）
- Workflow（工作流）

**层级过滤**:
- All（全部）
- Gold（金）
- Silver（银）
- Bronze（铜）

**搜索框**: 按 ID 或内容搜索

#### 观察卡片操作

**展开/收起**:
- 点击 "▶ 展开" 查看完整内容
- 点击 "▼ 收起" 折叠

**手动操作菜单 (⋮)**:
- **↑ Promote**: 手动提升到上下文池
- **⊘ Ignore**: 标记为忽略（设置 manualOverride）
- **× Delete**: 删除观察（需确认）

**批量操作**:
- **批量提升 Gold**: 一键提升所有金级观察

#### Archived Tab 操作

**恢复观察**:
- 点击 "↻ 恢复" 按钮
- 观察重新进入活跃池

**永久删除**:
- 点击 "× 永久删除" 按钮
- 需确认操作
- 观察无法恢复

**过期倒计时**:
- 正常: "过期倒计时: 25 天"（灰色）
- 即将过期: "过期倒计时: 5 天"（橙色 + ⚠️ 警告）
- 已过期: "已过期（待清理）"（红色）

### Settings 页面 - Learning Tab

**访问**: `http://localhost:10010/settings` → Learning 标签

#### 容量配置

**候选池大小滑块** (10-200):
- 拖动滑块调整 `targetSize`
- 实时显示当前池大小
- 进度条显示池满度

#### 衰减配置

**记忆半衰期滑块** (7-90 天):
- 拖动滑块调整 `halfLifeDays`
- 显示当前配置值

**启用时间衰减开关**:
- 切换 `decay.enabled`
- 关闭后观察不会衰减

#### 提升阈值

**自动提升配置**:
- 置信度阈值: 0-100%（默认 75%）
- 提及次数: 1-20（默认 5）

**快速通道配置**:
- 置信度阈值: 0-100%（默认 90%）
- 提及次数: 1-20（默认 3）

#### 删除策略

**立即删除阈值**: 0-50%（默认 25%）
- 低于此置信度立即删除

**延迟删除阈值**: 0-60%（默认 40%）
- 低于此置信度且超过延迟天数后删除

**延迟天数**: 1-90 天（默认 14）

#### 归档保留

**归档保留天数**: 1-180 天（默认 30）

#### 保存配置

- 点击 "💾 保存配置" 按钮
- 成功: 绿色 Toast 通知
- 失败: 红色 Toast 通知并显示错误信息

---

## 故障排查

### 问题 1: 观察未自动提升

**症状**: 观察满足提升条件（Gold 层级）但未进入上下文池。

**排查步骤**:
1. **检查调度器状态**:
   ```bash
   claude-evolution status
   ```
   确认守护进程正在运行。

2. **查看日志**:
   ```bash
   claude-evolution logs -f
   ```
   搜索 "Auto-promotion" 相关日志。

3. **检查配置**:
   ```bash
   cat ~/.claude-evolution/config.json | grep -A 10 "promotion"
   ```
   确认 `auto.confidence` 和 `auto.mentions` 设置正确。

4. **手动触发合并**:
   ```bash
   claude-evolution analyze --now
   ```

**常见原因**:
- 守护进程未运行
- 提升阈值设置过高
- 观察带有 `manualOverride.action: "ignore"`

### 问题 2: 池容量持续增长

**症状**: Active Pool 超过 `maxSize` 且未触发容量控制。

**排查步骤**:
1. **检查容量配置**:
   ```json
   {
     "learning": {
       "capacity": {
         "targetSize": 50,
         "maxSize": 60
       }
     }
   }
   ```
   确认 `maxSize` 设置合理。

2. **检查手动干预数量**:
   带有 `manualOverride` 的观察不会被容量控制淘汰。

   ```bash
   # 查看 active.json 中带有 manualOverride 的观察
   cat ~/.claude-evolution/memory/observations/active.json | \
     jq '[.[] | select(.manualOverride != null)] | length'
   ```

3. **查看容量控制日志**:
   ```bash
   claude-evolution logs | grep "Capacity control"
   ```

**解决方案**:
- 提高 `maxSize` 或降低 `targetSize`
- 清理不需要的手动干预观察
- 手动删除低质量观察

### 问题 3: 时间衰减过快

**症状**: 观察置信度下降太快，频繁进入删除阈值。

**排查步骤**:
1. **检查半衰期配置**:
   ```json
   {
     "learning": {
       "decay": {
         "halfLifeDays": 30
       }
     }
   }
   ```

2. **计算衰减效果**:
   使用公式验证：
   ```
   天数 = 今天 - firstSeen
   衰减因子 = 0.5 ^ (天数 / halfLifeDays)
   ```

**解决方案**:
- 延长半衰期: 30 → 60 天
- 降低删除阈值: 0.25 → 0.15
- 增加延迟删除天数: 14 → 30 天

### 问题 4: LLM 合并过度激进

**症状**: 合并后观察数量大幅减少（>50%），不相关观察被合并。

**排查步骤**:
1. **查看合并日志**:
   ```bash
   claude-evolution logs | grep "LLM merge"
   ```
   查找 "over-merging detected" 警告。

2. **检查合并前后数量**:
   ```
   Original: 70 observations
   Merged: 25 observations
   Reduction: 64% ⚠️
   ```

**解决方案**:
- **短期**: 手动恢复被错误合并的观察
- **长期**: 调整 LLM 提示词（需要修改代码）
- **临时**: 降低单次合并的观察数量限制

### 问题 5: WebUI 数据不刷新

**症状**: 手动提升/删除后，WebUI 显示的数据未更新。

**排查步骤**:
1. **检查浏览器控制台**: 打开开发者工具，查看 API 请求是否成功。

2. **检查 API 响应**:
   ```bash
   curl http://localhost:10010/api/learning/observations
   ```

3. **刷新页面**: 强制刷新（Cmd+Shift+R 或 Ctrl+Shift+R）

**解决方案**:
- 清除浏览器缓存
- 重启守护进程: `claude-evolution restart`
- 检查文件权限: `~/.claude-evolution/memory/observations/`

### 问题 6: 归档观察未自动清理

**症状**: 归档池中超过 30 天的观察未被删除。

**排查步骤**:
1. **检查保留天数配置**:
   ```json
   {
     "learning": {
       "retention": {
         "archivedDays": 30
       }
     }
   }
   ```

2. **查看归档清理日志**:
   ```bash
   claude-evolution logs | grep "Deleted.*expired archived"
   ```

3. **手动检查归档时间**:
   ```bash
   cat ~/.claude-evolution/memory/observations/archived.json | \
     jq '.[] | {id, archiveTimestamp}'
   ```

**解决方案**:
- 等待下次调度器运行（每 6 小时）
- 手动触发分析: `claude-evolution analyze --now`
- 手动清理: 在 WebUI Archived Tab 中永久删除

---

## 最佳实践

### 1. 定期审查 Learning Review

**频率**: 每周 1-2 次

**操作**:
- 检查 Gold 层级观察，手动提升优质内容
- 删除明显错误的观察
- 调整提升阈值（如果发现 Gold 观察过多或过少）

### 2. 根据工作模式调整配置

**新项目启动期** (1-3 个月):
- 半衰期: 14-21 天（快速迭代）
- 提升阈值: 适当降低（快速积累上下文）
- 容量: 60-80（允许更多多样性）

**项目稳定期** (3 个月以上):
- 半衰期: 30-45 天（标准设置）
- 提升阈值: 标准值（75% / 5 次）
- 容量: 40-60（保持精简）

### 3. 保护关键观察

**场景**: 某些观察虽然不频繁出现，但对团队很重要。

**操作**: 手动提升并添加备注
```json
{
  "manualOverride": {
    "action": "promote",
    "reason": "Team coding standard - critical for onboarding",
    "timestamp": "2026-03-15T10:00:00Z"
  }
}
```

### 4. 监控归档池

**目的**: 防止有价值观察被误删。

**操作**:
- 每月检查 Archived Tab
- 恢复被错误淘汰的观察
- 调整容量控制策略（如果淘汰过于频繁）

### 5. 定期备份观察池

**频率**: 每月 1 次

**命令**:
```bash
cp -r ~/.claude-evolution/memory/observations/ \
  ~/backups/claude-evolution-$(date +%Y%m%d)/
```

**用途**: 灾难恢复、误操作回滚

---

## 系统限制

### 当前版本限制 (v0.3.0)

1. **LLM 合并质量依赖提示词**
   - 可能出现过度合并或合并不足
   - 计划在 v0.4.0 改进提示词工程

2. **无批量编辑功能**
   - 只能单个操作观察
   - 计划在 v0.4.0 添加批量编辑

3. **无观察搜索高级过滤**
   - 只能按类型和层级过滤
   - 计划添加按时间范围、置信度范围过滤

4. **无观察导出/导入**
   - 无法在不同实例间共享观察
   - 计划在 v0.5.0 添加

5. **无观察版本历史**
   - 无法查看观察的修改历史
   - 计划在 v0.5.0 添加

### 性能限制

- **LLM 合并速度**: 8-15 秒（取决于 API 延迟）
- **单次合并上限**: 50 个旧观察 + 20 个新观察
- **推荐池大小**: 30-80 个观察（超过 100 会影响性能）

---

## 未来路线图

### v0.4.0 (计划中)

- [ ] 批量编辑观察
- [ ] 高级过滤器（时间范围、置信度范围）
- [ ] 观察标签系统
- [ ] 改进 LLM 合并提示词
- [ ] 添加观察评论功能

### v0.5.0 (计划中)

- [ ] 观察导出/导入（JSON、YAML）
- [ ] 观察版本历史
- [ ] 多用户协作（团队共享观察池）
- [ ] 观察推荐系统（基于团队习惯）
- [ ] 性能优化（大规模观察池支持）

---

## 相关文档

- [API Reference](./API.md) - 学习系统 API 端点
- [CLI Reference](./CLI_REFERENCE.md) - 命令行工具使用
- [Architecture](./ARCHITECTURE.md) - 系统架构设计
- [Deployment](./DEPLOYMENT.md) - 部署和运维指南
- [Phase Test Reports](./TEST_REPORT_PHASE*.md) - 各阶段测试报告

---

## 反馈与贡献

**问题反馈**: [GitHub Issues](https://github.com/yourusername/claude-evolution/issues)
**功能建议**: [GitHub Discussions](https://github.com/yourusername/claude-evolution/discussions)
**贡献指南**: [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Last Updated**: 2026-03-15
**Version**: 0.3.0
