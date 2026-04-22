# 🔄 Claude Evolution 自动分析流程

> **让 Claude Code 从你的每次对话中学习，自动进化成更懂你的 AI 助手**

---

## 💡 核心理念：从"遗忘"到"记忆"

你是否遇到过这些问题？
- ❌ 每次对话都要重复说明偏好："我用 TypeScript，别给我 JS 代码"
- ❌ Claude 总是生成你不需要的文档："我说了不要写 README，怎么又来了？"
- ❌ 已经修过的 Bug，下次又犯："上次说好用 immutable 的，怎么又 mutation 了？"
- ❌ 项目积累的最佳实践无法传承："新同事来了，Claude 又得从头教一遍"

**claude-evolution 就是为了解决这些问题而生的。**

它会自动分析你和 Claude Code 的所有历史对话，提取出你的工作偏好、问题解决模式和最佳实践，然后生成一个持续优化的 `CLAUDE.md` 配置文件。

**效果：** 让 Claude Code 成为一个"越用越懂你"的 AI 编程助手。

---

## 🎯 完整分析流程（5 步自动化）

### **第 1 步：自动收集会话数据** 📥

```
你的 Claude Code 会话
    ↓
[claude-mem 插件实时记录]
    ↓
Session Database (SQLite)
```

**发生了什么：**
- 你每次与 Claude Code 对话时，`claude-mem` 插件会自动记录会话内容
- 包括：你的问题、Claude 的回答、工具调用、文件改动、错误修复等
- 这些数据存储在本地 SQLite 数据库中（完全私密，不上传云端）

**用户无感知：** 这一步完全自动，你不需要做任何操作。

---

### **第 2 步：智能提取经验观察** 🔍

```
最近 7 天的会话
    ↓
[LLM 语义分析]
    ↓
提取出 5 类观察：
  - 用户偏好 (preferences)
  - 工作流程 (workflows)
  - 问题解决 (patterns)
  - 架构决策 (decisions)
  - 重要发现 (discoveries)
```

**举个例子：**

**原始会话片段：**
```
用户: "别用 mutation，创建新对象"
Claude: "好的，我改成 {...obj, newField: value}"
用户: "对，就是这样"
```

**提取出的观察：**
```yaml
type: preference
title: "强制不可变数据模式"
content: |
  用户要求所有数据操作使用不可变模式：
  - ❌ 禁止：obj.field = value
  - ✅ 使用：{...obj, field: value}
  - 原因：避免副作用，便于调试
applied: 15次
confidence: 95%
```

**价值：** LLM 会理解"为什么"你要这样做，而不是简单记录"做了什么"。

---

### **第 3 步：观察池分层管理** 🗂️

```
新提取的观察
    ↓
Active Pool (候选池)
    ↓
  [验证有效性]
    ↓
Context Pool (上下文池) ← 最终写入 CLAUDE.md
    ↓
  [时间衰减]
    ↓
Archived Pool (归档池)
```

**三层架构：**

| 层级 | 说明 | 容量 | 作用 |
|------|------|------|------|
| **Active Pool** | 新提取的观察，待验证 | 200条 | 防止误判，观察是否真实有效 |
| **Context Pool** | 高质量、已验证的观察 | 50条 | 写入 CLAUDE.md，直接影响 Claude 行为 |
| **Archive Pool** | 过时或已删除的观察 | 无限 | 保留历史，支持回滚和审计 |

**智能机制：**
- **自动提升：** Active Pool 中的观察如果在多次会话中被应用，会自动晋升到 Context Pool
- **时间衰减：** 长期未使用的观察会降低权重，最终进入 Archive Pool
- **手动干预：** 在 Web UI 中可以手动标记、编辑或删除任何观察

**用户可控：** 你可以在 Web UI 的 "Learning Review" 页面查看和管理所有观察。

---

### **第 4 步：生成 CLAUDE.md 配置文件** 📝

```
Context Pool (15条高质量观察)
         +
source/ 目录 (静态规则)
    ↓
[智能合并 + 去重]
    ↓
~/.claude/CLAUDE.md
```

**生成的 CLAUDE.md 包含：**

```markdown
# Claude Code 配置

## 用户偏好 (自动学习)
- 强制不可变数据模式
- 禁止生成文档文件
- 优先使用 TypeScript 严格模式
- ...

## 工作流程 (自动学习)
- 提交前必须运行测试
- 使用约定式提交格式
- ...

## 架构决策 (自动学习)
- API 响应统一使用 {success, data, error} 格式
- 数据库操作使用 Repository 模式
- ...

## 静态规则 (source/ 目录)
- 安全检查清单
- Git 工作流程
- 测试要求 (80% 覆盖率)
- ...
```

**强大之处：**
- **动态 + 静态：** 自动学习的偏好 + 手动编写的规则
- **版本控制：** 每次生成都会记录版本，支持回滚
- **实时生效：** 文件一旦更新，Claude Code 立即使用最新配置

---

### **第 5 步：持续优化和验证** 🔁

```
新的 Claude Code 会话
    ↓
应用最新的 CLAUDE.md 配置
    ↓
观察 Claude 行为是否符合预期
    ↓
  符合？
   ✅ 是 → 提升该观察的权重
   ❌ 否 → 降低权重或移除
    ↓
下次分析时进一步优化
```

**闭环机制：**
- 系统会检测 Claude 是否遵守了 CLAUDE.md 中的规则
- 如果 Claude 还是犯了同样的错误，说明规则描述不够清晰，会触发重新优化
- 如果某条规则从未被应用，会逐渐降低优先级

**自我进化：** 系统会不断学习和优化，让 CLAUDE.md 越来越精准。

---

## 🎨 可视化展示：Web UI Dashboard

打开 `http://localhost:10010`，你会看到：

### **首页 Dashboard**
```
📊 系统概览
  - 总会话数：328 次
  - 学习的观察：42 条
  - 活跃规则：15 条
  - 最后分析：2 小时前

📈 分析统计
  - 偏好类：8 条
  - 工作流：5 条
  - 架构决策：2 条

🔔 最近更新
  - 新增："禁止使用 console.log"
  - 晋升："强制 TypeScript 严格模式"
  - 归档："旧的 API 格式规则"
```

### **Learning Review 页面**
- 查看所有观察（Active / Context / Archive）
- 每条观察显示：
  - 📝 内容摘要
  - ⏱️ 创建时间
  - 🎯 应用次数
  - 💯 置信度得分
- 支持操作：
  - ✏️ 编辑内容
  - ⬆️ 手动提升到 Context Pool
  - 🗑️ 删除或归档
  - 🔍 查看关联会话

### **Settings 页面**
- 🤖 LLM 配置：切换 Claude/OpenAI/CCR
- ⏰ 调度设置：6h/12h/24h/定时模式
- 📊 学习参数：调整池容量、衰减速率
- 🔔 提醒系统：桌面通知/钉钉/飞书 Webhook

---

## 💎 核心价值：为什么选择 claude-evolution？

### **1. 节省时间 ⏱️**
- **之前：** 每次对话重复说明偏好，浪费 5-10 分钟
- **之后：** 系统自动记住，立即开始高效协作

### **2. 减少错误 🛡️**
- **之前：** Claude 重复犯已修复的错误，浪费时间调试
- **之后：** 系统自动学习最佳实践，避免重复错误

### **3. 知识沉淀 📚**
- **之前：** 项目经验分散在各个会话中，无法复用
- **之后：** 自动提取和整理，形成可复用的知识库

### **4. 团队协作 🤝**
- **之前：** 新成员加入，Claude 需要重新学习团队规范
- **之后：** 一份 CLAUDE.md 配置文件，团队共享最佳实践

### **5. 持续进化 🚀**
- **之前：** 手动维护 CLAUDE.md，繁琐且容易遗漏
- **之后：** 系统自动优化，配置文件与时俱进

---

## 🔥 真实使用场景

### **场景 1：个人开发者**
张三是一名全栈工程师，经常使用 Claude Code 辅助开发。

**痛点：**
- 每次开新项目，都要重复告诉 Claude："我用 Prisma ORM，别给我写原始 SQL"
- Claude 总是生成他不需要的单元测试文件

**使用 claude-evolution 后：**
1. 系统自动分析了他过去 3 个月的会话
2. 提取出偏好："优先使用 Prisma Schema，禁止生成 *.test.ts 文件（他有自己的测试框架）"
3. 生成的 CLAUDE.md 让 Claude 自动遵守这些规则
4. **结果：** 每次对话节省 10 分钟，专注于核心业务逻辑

---

### **场景 2：技术团队**
某创业公司技术团队使用 Claude Code 进行协作开发。

**痛点：**
- 新成员加入，Claude 不了解团队的代码规范（如：必须用 Repository 模式）
- 不同成员使用 Claude 的方式不一致，导致代码风格混乱

**使用 claude-evolution 后：**
1. 团队将 `~/.claude-evolution/source/` 目录纳入 Git 仓库管理
2. 系统自动学习团队的最佳实践，生成统一的 CLAUDE.md
3. 所有成员共享同一份配置文件
4. **结果：** 代码质量提升 30%，Code Review 时间减少 50%

---

### **场景 3：技术咨询顾问**
李四是一名技术顾问，服务多个客户项目。

**痛点：**
- 切换项目时，Claude 不记得每个项目的特殊要求
- 例如：客户 A 要求用 Vue3，客户 B 要求用 React

**使用 claude-evolution 后：**
1. 为每个客户创建独立的项目目录
2. 系统自动为每个项目生成专属的 CLAUDE.md
3. 切换项目时，Claude 自动加载对应配置
4. **结果：** 上下文切换时间减少 80%，客户满意度大幅提升

---

## 🚀 立即开始

### **30 秒快速安装**

```bash
# 1. 安装 claude-mem 插件（在 Claude Code 中执行）
/plugin install claude-mem

# 2. 全局安装 claude-evolution
npm install -g claude-evolution

# 3. 初始化配置
claude-evolution init

# 4. 启动守护进程
claude-evolution start

# 5. 打开 Web UI
open http://localhost:10010
```

**就这么简单！** 系统会自动分析你的历史会话，并开始优化你的 CLAUDE.md 配置。

---

## 📦 系统要求

- ✅ Node.js >= 18
- ✅ Claude Code 已安装
- ✅ claude-mem 插件 (必需)
- ✅ ANTHROPIC_API_KEY 或其他 LLM API Key

---

## 🌟 立即下载

- **GitHub**: https://github.com/Xinbaiyu/claude-evolution
- **NPM**: `npm install -g claude-evolution`
- **文档**: 完整文档位于 `docs/` 目录

---

## 🤝 加入我们

遇到问题？有建议？
- 提交 Issue: https://github.com/Xinbaiyu/claude-evolution/issues
- 贡献代码: https://github.com/Xinbaiyu/claude-evolution/pulls
- 讨论交流: GitHub Discussions

---

**Built with ❤️ using Claude Code**

*让每一次对话都成为进化的起点*
