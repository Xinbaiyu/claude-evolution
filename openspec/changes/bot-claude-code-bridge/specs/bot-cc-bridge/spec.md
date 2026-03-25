## bot-cc-bridge

### 概述
将钉钉机器人的 LLM fallback 从直接调 Anthropic API 改为 spawn `claude -p` 子进程，获得与 Claude Code CLI 一致的完整能力（工具调用、文件操作、命令执行等）。

### 用户交互示例

```
用户: 在 ~/projects/myapp 帮我看下为什么登录报错
Bot:  正在处理... (Claude Code 执行中)
Bot:  [CC 执行结果，包含代码分析、文件内容、修复建议等]

用户: 帮我写个排序算法
Bot:  正在处理...
Bot:  [CC 在默认目录下执行，返回代码]
```

### 行为要求

- [ ] 无匹配固定命令时触发 CCBridgeHandler（替代原 ChatCommand）
- [ ] 同步回复"正在处理... (Claude Code 执行中)"
- [ ] 从消息中解析工作目录（"在 <path>"），无则使用默认目录
- [ ] 验证工作目录在 `allowedDirs` 白名单中，不在则拒绝
- [ ] spawn `claude -p --output-format json --permission-mode bypassPermissions` 子进程
- [ ] 注入群聊上下文历史作为 `--append-system-prompt`
- [ ] 设置超时（默认 2 分钟），超时自动 kill 子进程
- [ ] 设置预算限制 `--max-budget-usd`（默认 0.5）
- [ ] 解析 JSON 输出提取回复文本
- [ ] 通过 sessionWebhook 推送 CC 执行结果
- [ ] CC 执行失败时推送友好错误信息
- [ ] 结果超过钉钉消息长度限制时截断
- [ ] 将用户消息 + CC 回复写入群聊上下文记忆
- [ ] spawn 时继承 `process.env`，兼容 CCR（claude-code-router）
- [ ] 配置了 `bot.cc.baseURL` 时注入 `ANTHROPIC_BASE_URL` 到子进程环境变量
- [ ] `claude` 不在 PATH 中时返回配置提示

### 配置

```json
{
  "bot": {
    "cc": {
      "enabled": true,
      "defaultCwd": "~/projects",
      "allowedDirs": ["~/projects", "~/work"],
      "timeoutMs": 120000,
      "maxBudgetUsd": 0.5,
      "permissionMode": "bypassPermissions",
      "baseURL": "http://127.0.0.1:3456"
    }
  }
}
```
