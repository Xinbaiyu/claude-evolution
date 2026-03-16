# WebUI Verification Guide: Incremental Learning System

> **完整验证流程** - 测试增量学习系统的所有 WebUI 功能

---

## 快速开始

### 1. 启动系统

```bash
# 确保在项目目录
cd /Users/xinbaiyu/Desktop/other_code/claude-evolution

# 启动守护进程
claude-evolution start

# 验证状态
claude-evolution status

# 打开 WebUI
open http://localhost:10010
```

### 2. 创建测试数据

**选择 A: 使用真实数据**（如果你有 Claude Code 使用历史）

```bash
claude-evolution analyze --now
```

**选择 B: 使用测试数据**（快速验证）

```bash
# 创建 Active Pool 测试数据（5 个观察）
mkdir -p ~/.claude-evolution/memory/observations

cat > ~/.claude-evolution/memory/observations/active.json << 'EOF'
[
  {
    "id": "test-obs-001",
    "type": "preference",
    "item": {"type": "Code Style", "description": "Always use const for immutable variables"},
    "confidence": 0.85,
    "originalConfidence": 0.85,
    "mentions": 6,
    "evidence": ["session-001", "session-002"],
    "firstSeen": "2026-03-01T10:00:00Z",
    "lastSeen": "2026-03-15T10:00:00Z",
    "inContext": false
  },
  {
    "id": "test-obs-002",
    "type": "pattern",
    "item": {"problem": "Need to validate API responses", "solution": "Use Zod schemas for runtime validation"},
    "confidence": 0.78,
    "originalConfidence": 0.80,
    "mentions": 4,
    "evidence": ["session-003"],
    "firstSeen": "2026-03-05T10:00:00Z",
    "lastSeen": "2026-03-14T10:00:00Z",
    "inContext": false
  },
  {
    "id": "test-obs-003",
    "type": "workflow",
    "item": {"name": "Pre-commit verification", "steps": ["Run type check: tsc --noEmit", "Run linter: eslint .", "Run tests: npm test", "Create commit: git commit"]},
    "confidence": 0.92,
    "originalConfidence": 0.90,
    "mentions": 8,
    "evidence": ["session-004", "session-005"],
    "firstSeen": "2026-02-20T10:00:00Z",
    "lastSeen": "2026-03-15T10:00:00Z",
    "inContext": false
  },
  {
    "id": "test-obs-004",
    "type": "preference",
    "item": {"type": "Testing", "description": "Write tests first (TDD approach)"},
    "confidence": 0.55,
    "originalConfidence": 0.70,
    "mentions": 2,
    "evidence": ["session-006"],
    "firstSeen": "2026-01-15T10:00:00Z",
    "lastSeen": "2026-02-10T10:00:00Z",
    "inContext": false
  },
  {
    "id": "test-obs-005",
    "type": "pattern",
    "item": {"problem": "Manage application state", "solution": "Use React Context for shared state"},
    "confidence": 0.45,
    "originalConfidence": 0.65,
    "mentions": 1,
    "evidence": ["session-007"],
    "firstSeen": "2025-12-01T10:00:00Z",
    "lastSeen": "2025-12-15T10:00:00Z",
    "inContext": false
  }
]
EOF

# 创建 Context Pool 测试数据（1 个观察）
cat > ~/.claude-evolution/memory/observations/context.json << 'EOF'
[
  {
    "id": "test-ctx-001",
    "type": "preference",
    "item": {"type": "Architecture", "description": "Use immutable data patterns - never mutate objects"},
    "confidence": 0.95,
    "originalConfidence": 0.90,
    "mentions": 12,
    "evidence": ["session-ctx-001", "session-ctx-002", "session-ctx-003"],
    "firstSeen": "2026-02-01T10:00:00Z",
    "lastSeen": "2026-03-15T10:00:00Z",
    "inContext": true,
    "manualOverride": {"action": "promote", "reason": "Core team standard", "timestamp": "2026-03-10T10:00:00Z"}
  }
]
EOF

# 创建 Archived Pool 测试数据（2 个观察）
cat > ~/.claude-evolution/memory/observations/archived.json << 'EOF'
[
  {
    "id": "test-arch-001",
    "type": "preference",
    "item": {"type": "Tools", "description": "Use npm instead of yarn"},
    "confidence": 0.20,
    "originalConfidence": 0.70,
    "mentions": 2,
    "evidence": ["session-old-001"],
    "firstSeen": "2025-10-01T10:00:00Z",
    "lastSeen": "2025-11-01T10:00:00Z",
    "inContext": false,
    "archiveReason": "expired",
    "archiveTimestamp": "2026-02-01T10:00:00Z"
  },
  {
    "id": "test-arch-002",
    "type": "pattern",
    "item": {"problem": "Handle async operations", "solution": "Use promises instead of callbacks"},
    "confidence": 0.60,
    "originalConfidence": 0.75,
    "mentions": 3,
    "evidence": ["session-old-002"],
    "firstSeen": "2026-01-01T10:00:00Z",
    "lastSeen": "2026-02-01T10:00:00Z",
    "inContext": false,
    "archiveReason": "capacity_control",
    "archiveTimestamp": "2026-03-01T10:00:00Z"
  }
]
EOF

echo "✅ 测试数据创建完成"
echo "📊 Active Pool: 5 observations"
echo "📚 Context Pool: 1 observation"
echo "🗄️ Archived Pool: 2 observations"
```

---

## 验证步骤

### Step 1: Learning Review - Active Tab

**访问**: `http://localhost:10010/learning-review`

**验证检查点**:

1. ✅ **Tab 导航**
   - 看到三个 Tab: 活跃池 / 上下文池 / 归档池
   - Tab 显示数量: `活跃池 (5)`、`上下文池 (1)`、`归档池 (2)`

2. ✅ **层级分组**（Gold/Silver/Bronze）
   - 🥇 Gold: test-obs-003（confidence 0.92, mentions 8）
   - 🥈 Silver: test-obs-001, test-obs-002（confidence ≥ 0.60）
   - 🥉 Bronze: test-obs-004, test-obs-005（confidence < 0.60）

3. ✅ **折叠/展开功能**
   - 点击层级标题的 "▼ 收起" / "▶ 展开"
   - 点击观察卡片的 "▶ 展开" 查看完整内容

4. ✅ **时间衰减可视化**
   - test-obs-004: 显示 "70% → 55% ⚠ 显著衰减"
   - test-obs-005: 显示 "65% → 45% ⚠ 显著衰减"

5. ✅ **过滤器功能**
   - 类型过滤: 点击 "偏好" → 只显示 preference 类型
   - 层级过滤: 点击 "Gold" → 只显示金级观察
   - 搜索框: 输入 "const" → 过滤到 test-obs-001

6. ✅ **手动操作**
   - 点击 "⋮" 菜单
   - 测试 "↑ Promote" → 观察移到 Context Tab
   - 测试 "× Delete" → 观察进入 Archived Tab

7. ✅ **批量提升**
   - 点击 "批量提升 Gold" 按钮
   - Toast 显示: "成功提升 1 个观察"
   - test-obs-003 移到 Context Tab

### Step 2: Learning Review - Context Tab

**切换到 Context Tab**

**验证检查点**:

1. ✅ **徽章显示**
   - 绿色 "已在上下文" 徽章
   - 紫色 "手动提升" 徽章（如有 manualOverride）

2. ✅ **降级功能**
   - 点击 "⋮" → "↓ 降级"
   - Toast: "观察已降级"
   - 观察回到 Active Tab

### Step 3: Learning Review - Archived Tab

**切换到 Archived Tab**

**验证检查点**:

1. ✅ **统计卡片**
   - 总数: 2
   - 容量控制归档: 1
   - 过期/删除: 1

2. ✅ **归档原因显示**
   - test-arch-001: "过期" 徽章
   - test-arch-002: "容量控制" 徽章

3. ✅ **过期倒计时**
   - 显示 "过期倒计时: X 天"
   - 或 "已过期（待清理）"（红色）

4. ✅ **恢复功能**
   - 点击 "↻ 恢复"
   - Toast: "观察已恢复到活跃池"
   - 回 Active Tab 验证

5. ✅ **永久删除**
   - 点击 "× 永久删除"
   - 确认对话框弹出
   - 确认后观察消失

### Step 4: Settings - Learning Tab

**访问**: `http://localhost:10010/settings` → Learning Tab

**验证检查点**:

1. ✅ **配置加载**
   - 所有滑块显示当前值
   - 池大小进度条显示正确

2. ✅ **容量配置**
   - 拖动 "候选池大小" 滑块
   - 进度条颜色变化（绿/黄/红）

3. ✅ **衰减配置**
   - 拖动 "记忆半衰期" 滑块
   - 切换 "启用时间衰减" 开关

4. ✅ **提升阈值**
   - 修改置信度阈值（0-100%）
   - 修改提及次数（1-20）

5. ✅ **保存配置**
   - 点击 "💾 保存配置"
   - 绿色 Toast: "配置保存成功"
   - 验证: `cat ~/.claude-evolution/config.json | jq '.learning'`

### Step 5: API 验证

**测试 API 端点**:

```bash
# 获取观察列表
curl http://localhost:10010/api/learning/observations | jq

# 获取统计
curl http://localhost:10010/api/learning/stats | jq

# 手动提升
curl -X POST http://localhost:10010/api/learning/promote \
  -H "Content-Type: application/json" \
  -d '{"id": "test-obs-001"}'

# 恢复归档
curl -X POST http://localhost:10010/api/learning/restore \
  -H "Content-Type: application/json" \
  -d '{"id": "test-arch-001"}'
```

### Step 6: 自动学习周期

**触发完整周期**:

```bash
# 手动触发
claude-evolution analyze --now

# 查看日志
claude-evolution logs -f
```

**验证日志输出**:
- ✅ LLM merge complete
- ✅ Temporal decay applied
- ✅ Auto-promotion: X observations promoted
- ✅ Deletion: X observations deleted
- ✅ Capacity control complete
- ✅ CLAUDE.md regenerated

---

## 验证清单总览

### WebUI 功能（15 项）

- [ ] Learning Review - Active Tab 显示
- [ ] 层级分组（Gold/Silver/Bronze）
- [ ] 过滤器（类型/层级/搜索）
- [ ] 观察卡片展开/折叠
- [ ] 时间衰减可视化
- [ ] 手动操作菜单（Promote/Ignore/Delete）
- [ ] 批量提升 Gold
- [ ] Learning Review - Context Tab 显示
- [ ] 已在上下文徽章
- [ ] 降级功能
- [ ] Learning Review - Archived Tab 显示
- [ ] 归档统计卡片
- [ ] 恢复/永久删除操作
- [ ] Settings - Learning Tab 配置加载
- [ ] Settings - 保存配置成功

### API 功能（7 项）

- [ ] GET /api/learning/observations
- [ ] POST /api/learning/promote
- [ ] POST /api/learning/demote
- [ ] POST /api/learning/delete
- [ ] POST /api/learning/restore
- [ ] GET /api/learning/stats
- [ ] PUT /api/learning/config

### 自动学习周期（6 项）

- [ ] LLM 合并执行
- [ ] 时间衰减应用
- [ ] 自动提升触发
- [ ] 删除策略执行
- [ ] 容量控制执行
- [ ] CLAUDE.md 重新生成

---

## 故障排查

### 问题 1: 页面空白或 404

```bash
# 检查守护进程
claude-evolution status

# 重启
claude-evolution restart

# 检查前端构建
cd web/client && npm run build
```

### 问题 2: 观察数据不显示

```bash
# 检查文件
ls -lh ~/.claude-evolution/memory/observations/

# 查看内容
cat ~/.claude-evolution/memory/observations/active.json | jq

# 测试 API
curl http://localhost:10010/api/learning/observations | jq
```

### 问题 3: 操作按钮无响应

1. 打开浏览器开发者工具（F12）
2. 查看 Console 错误
3. 查看 Network 请求
4. 检查守护进程日志: `claude-evolution logs`

---

## 清理测试数据

验证完成后，清理测试数据：

```bash
# 删除测试观察文件
rm ~/.claude-evolution/memory/observations/*.json

# 或重置整个目录
rm -rf ~/.claude-evolution/memory/observations
mkdir -p ~/.claude-evolution/memory/observations
echo '[]' > ~/.claude-evolution/memory/observations/active.json
echo '[]' > ~/.claude-evolution/memory/observations/context.json
echo '[]' > ~/.claude-evolution/memory/observations/archived.json
```

---

## 验证完成 ✅

如果所有检查点通过，增量学习系统已成功验证！

**下一步**:
1. 使用真实会话数据: `claude-evolution analyze --now`
2. 根据工作模式调整配置
3. 定期查看 Learning Review 审查观察
4. 享受自动化的 CLAUDE.md 优化

---

**Last Updated**: 2026-03-15
**Version**: 0.3.0
