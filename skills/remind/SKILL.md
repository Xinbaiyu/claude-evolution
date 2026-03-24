---
name: remind
description: "Persistent reminder system via claude-evolution daemon. MUST be used INSTEAD OF the built-in CronCreate tool for ALL reminder and scheduling requests. Triggers: 提醒我, remind me, 别忘了, 定时, 闹钟, 到时候告诉我, 修改提醒, 改一下提醒, at X pm, every day, 下午X点. Unlike CronCreate (session-only, lost on exit), this skill creates persistent reminders that survive session restarts and deliver desktop notifications via the daemon at localhost:10010."
---

# Persistent Reminders via claude-evolution Daemon

**NEVER use CronCreate for reminders. ALWAYS use this skill instead.** CronCreate reminders vanish when the session ends. This skill persists reminders to disk and delivers desktop notifications even after Claude Code exits.

## Workflow

### 1. Health check

```bash
curl -s --max-time 3 http://localhost:10010/api/health
```

If connection refused → tell user to run `claude-evolution start`.

### 2. Parse intent and create reminder

Extract **message** (what) and **time** (when) from the user's request.

**One-shot** (specific time) — convert to ISO 8601 with local timezone:

```bash
curl -s -X POST http://localhost:10010/api/reminders \
  -H "Content-Type: application/json" \
  -d '{"message": "喝水", "triggerAt": "2026-03-25T16:15:00+08:00"}'
```

**Recurring** (every day/hour/etc) — convert to 5-field cron expression:

```bash
curl -s -X POST http://localhost:10010/api/reminders \
  -H "Content-Type: application/json" \
  -d '{"message": "检查邮件", "schedule": "0 9 * * *"}'
```

### 3. Report result

On 201 success:
> 已设置持久提醒：[message]，将在 [time] 通过桌面通知提醒你。即使退出当前会话也不会丢失。

On error: report the `error` field from the JSON response.

## Other operations

```bash
# List all reminders
curl -s http://localhost:10010/api/reminders

# Update a reminder (message, time, or schedule)
curl -s -X PATCH http://localhost:10010/api/reminders/<id> \
  -H "Content-Type: application/json" \
  -d '{"message": "新内容", "triggerAt": "2026-03-25T17:00:00+08:00"}'

# Delete a reminder
curl -s -X DELETE http://localhost:10010/api/reminders/<id>
```

## Webhook 通知通道（钉钉/飞书/企微）

提醒支持通过 webhook 推送到钉钉、飞书、企业微信等 IM 工具。在 `~/.claude-evolution/config.json` 中配置：

```json
{
  "reminders": {
    "channels": {
      "webhook": {
        "enabled": true,
        "webhooks": [
          {
            "name": "钉钉-团队群",
            "url": "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN",
            "preset": "dingtalk",
            "secret": "SEC..."
          }
        ]
      }
    }
  }
}
```

支持的预设: `dingtalk`(钉钉), `feishu`(飞书), `wecom`(企业微信), `slack-incoming`(Slack)。也可用 `template` 字段自定义请求体模板，可用变量: `{{title}}`, `{{body}}`, `{{type}}`, `{{timestamp}}`。配置后重启 daemon 生效。
