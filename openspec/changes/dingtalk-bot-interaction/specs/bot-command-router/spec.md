## bot-command-router

### 概述
将 @bot 消息路由到对应的命令处理器，执行后返回结构化回复。

### 命令定义

| 命令 | 别名 | 描述 | 回复格式 |
|------|------|------|----------|
| `/status` | `状态` | 系统状态概览 | Markdown |
| `/analyze` | `分析` | 手动触发分析 | Text |
| `/remind <msg> <time>` | `提醒 <msg> <time>` | 创建提醒 | Text |
| `/reminders` | `提醒列表` | 列出活跃提醒 | Markdown |
| `/help` | `帮助` | 命令列表 | Markdown |

### 行为要求

- [ ] 消息前缀匹配命令名或别名（忽略大小写）
- [ ] 命令匹配失败时 fallback 到 LLM 对话处理器（chat handler）
- [ ] LLM 对话返回 `async: true`，由 adapter 层处理异步回复
- [ ] `/status`: 读取 daemon 状态 + 观察池统计，返回 markdown 格式概览
- [ ] `/analyze`: 调用 AnalysisExecutor，已运行中则提示等待
- [ ] `/remind`: 解析自然语言时间（如"30分钟后"、"明天9点"），创建提醒
- [ ] `/reminders`: 列出所有 active 提醒，包含 ID、内容、触发时间
- [ ] `/help`: 列出所有可用命令及简要描述
- [ ] 命令执行异常时返回友好错误信息，不暴露堆栈
- [ ] 每个 CommandHandler 独立注册，支持后续扩展
