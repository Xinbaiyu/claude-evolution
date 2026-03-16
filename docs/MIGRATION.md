# Migration Guide: v0.2.x → v0.3.0

> **升级到增量学习系统** - 从传统建议审批流程迁移到自动观察管理

---

## 📋 目录

- [升级概述](#升级概述)
- [重大变更](#重大变更)
- [迁移步骤](#迁移步骤)
- [数据迁移](#数据迁移)
- [配置迁移](#配置迁移)
- [向后兼容性](#向后兼容性)
- [常见问题](#常见问题)
- [回滚方案](#回滚方案)

---

## 升级概述

### v0.3.0 新特性

✨ **增量学习系统**:
- **三层观察池**: Active（候选） → Context（上下文） → Archived（归档）
- **自动提升**: 高质量观察自动进入 CLAUDE.md
- **时间衰减**: 老旧观察自动降低置信度
- **智能合并**: LLM 识别并合并重复观察
- **容量控制**: 保持候选池在最优大小
- **WebUI 增强**: Learning Review 页面和 Settings 页面的 Learning Tab

### 升级收益

| 特性 | v0.2.x | v0.3.0 |
|------|--------|--------|
| 审批流程 | 全部手动 | 自动 + 手动 |
| 重复检测 | 无 | LLM 智能去重 |
| 过时清理 | 手动 | 自动衰减 |
| 容量管理 | 无限增长 | 自动控制 |
| 恢复误删 | 不支持 | 30 天归档 |

---

## 重大变更

### 1. 数据结构变更

#### v0.2.x 数据结构

```
~/.claude-evolution/
├── learned/
│   ├── pending.json       # 待审批建议
│   ├── approved.json      # 已批准建议
│   └── rejected.json      # 已拒绝建议
```

#### v0.3.0 数据结构

```
~/.claude-evolution/
├── learned/               # ⚠️ 已废弃，v0.3.0 不再使用
│   ├── pending.json      # 仅用于兼容性读取
│   ├── approved.json
│   └── rejected.json
├── memory/
│   └── observations/     # 🆕 新增：观察池存储
│       ├── active.json   # 候选池
│       ├── context.json  # 上下文池
│       └── archived.json # 归档池
```

### 2. API 端点变更

#### 新增端点

```
GET  /api/learning/observations        # 获取观察列表
POST /api/learning/promote             # 手动提升观察
POST /api/learning/demote              # 手动降级观察
POST /api/learning/ignore              # 标记忽略观察
POST /api/learning/delete              # 删除观察
POST /api/learning/restore             # 恢复归档观察
GET  /api/learning/stats               # 观察池统计
PUT  /api/learning/config              # 更新学习配置
```

#### 保留端点（向后兼容）

```
GET  /api/suggestions                  # ⚠️ 仍可用，但建议使用 /api/learning/observations
POST /api/suggestions/:id/approve      # ⚠️ 仍可用，但建议使用 /api/learning/promote
POST /api/suggestions/:id/reject       # ⚠️ 仍可用，但建议使用 /api/learning/delete
```

### 3. 配置文件变更

#### 新增配置字段

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

---

## 迁移步骤

### 步骤 1: 备份现有数据

**⚠️ 强烈建议** 在升级前备份所有数据：

```bash
# 备份整个配置目录
cp -r ~/.claude-evolution ~/backups/claude-evolution-$(date +%Y%m%d)/

# 或仅备份关键数据
mkdir -p ~/backups/claude-evolution-backup
cp ~/.claude-evolution/config.json ~/backups/claude-evolution-backup/
cp -r ~/.claude-evolution/learned ~/backups/claude-evolution-backup/
```

### 步骤 2: 停止守护进程

```bash
# 停止现有守护进程
claude-evolution stop

# 确认进程已停止
claude-evolution status
# 应显示 "守护进程未运行"
```

### 步骤 3: 升级代码

#### 方式 A: 从源码升级（推荐）

```bash
cd /path/to/claude-evolution

# 拉取最新代码
git fetch origin
git checkout v0.3.0

# 安装新依赖
npm install

# 重新编译
npm run build

# 重新链接（如果使用 npm link）
npm link
```

#### 方式 B: NPM 升级（未来支持）

```bash
npm update -g claude-evolution
```

### 步骤 4: 运行数据迁移

**自动迁移** 会在首次启动时执行：

```bash
# 启动守护进程
claude-evolution start

# 查看迁移日志
claude-evolution logs | grep "Migration"
```

**手动迁移**（仅在自动迁移失败时）：

```bash
# 运行迁移脚本
node dist/scripts/migrate-pending-to-active.js

# 验证迁移结果
ls -lh ~/.claude-evolution/memory/observations/
```

### 步骤 5: 验证升级

```bash
# 检查系统状态
claude-evolution status

# 查看观察池
claude-evolution review

# 访问 WebUI
open http://localhost:10010/learning-review
```

### 步骤 6: 调整配置（可选）

根据您的工作模式调整学习参数：

```bash
# 打开配置文件
vim ~/.claude-evolution/config.json

# 或通过 WebUI Settings 页面调整
open http://localhost:10010/settings
```

---

## 数据迁移

### pending.json → active.json

**迁移逻辑**:
```
1. 读取 learned/pending.json
2. 转换为 ObservationWithMetadata 格式
3. 设置初始元数据:
   - confidence = 原始 confidence
   - originalConfidence = 原始 confidence
   - mentions = frequency (如果有) 或 1
   - evidence = 原始 evidence 或空数组
   - firstSeen = createdAt 或当前时间
   - lastSeen = createdAt 或当前时间
   - inContext = false
4. 写入 memory/observations/active.json
5. 保留原始 pending.json（不删除，用于回滚）
```

**示例转换**:

**v0.2.x pending.json**:
```json
{
  "id": "sugg-001",
  "type": "preference",
  "item": {
    "type": "Code Style",
    "description": "Use const for immutable variables"
  },
  "confidence": 0.80,
  "createdAt": "2026-03-01T10:00:00Z"
}
```

**v0.3.0 active.json**:
```json
{
  "id": "sugg-001",
  "type": "preference",
  "item": {
    "type": "Code Style",
    "description": "Use const for immutable variables"
  },
  "confidence": 0.80,
  "originalConfidence": 0.80,
  "mentions": 1,
  "evidence": [],
  "firstSeen": "2026-03-01T10:00:00Z",
  "lastSeen": "2026-03-01T10:00:00Z",
  "inContext": false
}
```

### approved.json → context.json

**迁移逻辑**:
```
1. 读取 learned/approved.json
2. 转换为 ObservationWithMetadata 格式
3. 设置元数据:
   - inContext = true
   - manualOverride = { action: "promote", ... }
4. 写入 memory/observations/context.json
```

### rejected.json → archived.json

**迁移逻辑**:
```
1. 读取 learned/rejected.json
2. 转换为 ObservationWithMetadata 格式
3. 设置元数据:
   - archiveReason = "user_deleted"
   - archiveTimestamp = 当前时间
4. 写入 memory/observations/archived.json
```

---

## 配置迁移

### 自动配置合并

首次启动 v0.3.0 时，系统会：

1. **读取现有配置**: `~/.claude-evolution/config.json`
2. **合并默认 learning 配置**:
   ```json
   {
     "learning": {
       "enabled": true,
       "capacity": { "targetSize": 50, ... },
       "decay": { "enabled": true, ... },
       ...
     }
   }
   ```
3. **保存合并后配置**: 覆盖 `config.json`
4. **备份原始配置**: `config.json.backup-v0.2.x`

### 手动配置调整

如果需要自定义学习参数：

```bash
# 编辑配置文件
vim ~/.claude-evolution/config.json

# 调整关键参数
{
  "learning": {
    "capacity": {
      "targetSize": 80  # 增加候选池大小
    },
    "decay": {
      "halfLifeDays": 60  # 延长衰减周期
    },
    "promotion": {
      "auto": {
        "confidence": 0.70,  # 降低自动提升阈值
        "mentions": 3
      }
    }
  }
}

# 重启守护进程使配置生效
claude-evolution restart
```

---

## 向后兼容性

### 兼容性保证

✅ **完全兼容**:
- 旧的 CLI 命令仍可使用（`review`, `approve`, `history` 等）
- 旧的 API 端点仍可用（`/api/suggestions`）
- 旧的配置文件格式自动升级

⚠️ **部分兼容**:
- `pending.json` 仅在首次迁移时读取，后续不再更新
- 旧的 WebUI Review 页面仍可用，但建议使用新的 Learning Review

❌ **不兼容**:
- 直接修改 `learned/` 目录下的文件不再生效（应使用 `memory/observations/`）
- 某些内部 API 已废弃（不影响用户使用）

### 兼容性检测

系统会自动检测并提示：

```bash
$ claude-evolution status

⚠️  检测到 v0.2.x 数据格式
✓  自动迁移已完成
✓  建议删除 learned/ 目录以避免混淆
   运行: rm -rf ~/.claude-evolution/learned
```

---

## 常见问题

### Q1: 升级后我的旧建议去哪了？

**A**: 旧建议已迁移到新的观察池：
- `pending.json` → `active.json` (候选池)
- `approved.json` → `context.json` (上下文池)
- `rejected.json` → `archived.json` (归档池)

您可以在 WebUI Learning Review 页面查看它们。

### Q2: 升级后是否还需要手动审批？

**A**: 不需要全部手动审批。v0.3.0 引入自动提升机制：
- **自动提升**: 高质量观察（confidence≥75%, mentions≥5）会自动进入 CLAUDE.md
- **手动干预**: 您仍可通过 WebUI 或 CLI 手动提升/删除观察

### Q3: 如果我不喜欢自动提升怎么办？

**A**: 可以调整提升阈值或禁用自动提升：

```json
{
  "learning": {
    "promotion": {
      "auto": {
        "confidence": 0.95,  # 提高阈值，减少自动提升
        "mentions": 10
      }
    }
  }
}
```

或者设置极高阈值事实上禁用：
```json
{
  "learning": {
    "promotion": {
      "auto": {
        "confidence": 1.0,
        "mentions": 999
      }
    }
  }
}
```

### Q4: 时间衰减会影响已提升的观察吗？

**A**: 不会。已进入 Context Pool 的观察不再受时间衰减影响，它们会永久保留在 CLAUDE.md 中，除非您手动删除。

### Q5: 迁移失败怎么办？

**A**: 按以下步骤排查：

1. **查看迁移日志**:
   ```bash
   claude-evolution logs | grep "Migration"
   ```

2. **检查备份**:
   ```bash
   ls -lh ~/backups/claude-evolution-*
   ```

3. **手动恢复**:
   ```bash
   # 停止守护进程
   claude-evolution stop

   # 恢复备份
   cp -r ~/backups/claude-evolution-20260315/* ~/.claude-evolution/

   # 重新启动
   claude-evolution start
   ```

4. **联系支持**: 如果问题持续，请在 [GitHub Issues](https://github.com/yourusername/claude-evolution/issues) 报告。

### Q6: 升级后 CLAUDE.md 内容会变化吗？

**A**: 可能会有细微变化，因为：
- 新的 CLAUDE.md 生成器会从 Context Pool 读取数据
- 格式可能略有不同（但语义相同）
- 建议在升级后检查 `claude-evolution diff` 确认变更

### Q7: 我可以跳过迁移，手动设置吗？

**A**: 可以，但不推荐。如果您想全新开始：

```bash
# 备份旧数据
mv ~/.claude-evolution ~/backups/claude-evolution-old

# 重新初始化
claude-evolution init

# 手动添加观察（如果需要）
```

⚠️ **注意**: 这会丢失所有历史数据。

---

## 回滚方案

如果升级后遇到严重问题，可以回滚到 v0.2.x：

### 步骤 1: 停止 v0.3.0

```bash
claude-evolution stop
```

### 步骤 2: 恢复代码

```bash
cd /path/to/claude-evolution

# 切换回 v0.2.x
git checkout v0.2.10  # 替换为您的旧版本

# 重新安装依赖
npm install

# 重新编译
npm run build

# 重新链接
npm link
```

### 步骤 3: 恢复数据

```bash
# 恢复备份的配置目录
rm -rf ~/.claude-evolution
cp -r ~/backups/claude-evolution-20260315 ~/.claude-evolution
```

### 步骤 4: 重启守护进程

```bash
claude-evolution start
claude-evolution status
```

### 步骤 5: 验证回滚

```bash
# 检查版本
claude-evolution --version
# 应显示 v0.2.x

# 检查数据
ls ~/.claude-evolution/learned/
# 应显示 pending.json, approved.json, rejected.json
```

---

## 升级检查清单

升级前：
- [ ] 备份 `~/.claude-evolution/` 目录
- [ ] 停止守护进程
- [ ] 记录当前版本号

升级中：
- [ ] 拉取 v0.3.0 代码
- [ ] 安装依赖并编译
- [ ] 启动守护进程触发自动迁移

升级后：
- [ ] 验证 `memory/observations/` 目录创建成功
- [ ] 验证观察数量正确迁移
- [ ] 访问 WebUI Learning Review 页面
- [ ] 检查 `claude-evolution diff` 确认 CLAUDE.md 变更
- [ ] 调整学习参数（如果需要）
- [ ] 删除 `learned/` 目录（可选，清理旧数据）

---

## 相关文档

- [Learning System 完整文档](./LEARNING.md)
- [CLI Reference](./CLI_REFERENCE.md)
- [API Reference](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

## 反馈与支持

**问题反馈**: [GitHub Issues](https://github.com/yourusername/claude-evolution/issues)
**升级帮助**: [GitHub Discussions](https://github.com/yourusername/claude-evolution/discussions)

---

**Last Updated**: 2026-03-15
**Version**: 0.3.0
