## dingtalk-bot-reply

### 概述
将命令处理结果格式化为钉钉消息格式，通过 HTTP response 同步回复。

### 回复格式

**纯文本**:
```json
{
  "msgtype": "text",
  "text": { "content": "分析已启动，完成后会通知你" }
}
```

**Markdown** (用于状态、列表等):
```json
{
  "msgtype": "markdown",
  "markdown": {
    "title": "系统状态",
    "text": "### 系统状态\n- 调度器: **运行中**\n- 上次分析: 2小时前\n- 观察: 62条"
  }
}
```

### 行为要求

- [ ] BotReply.format === 'text' 时使用 text 格式
- [ ] BotReply.format === 'markdown' 时使用 markdown 格式
- [ ] Markdown 回复需要有 title 字段（取内容前 20 字符或命令名）
- [ ] 回复内容超过 2000 字符时截断并追加 "...（内容已截断）"
- [ ] 格式化函数纯函数实现，便于测试
