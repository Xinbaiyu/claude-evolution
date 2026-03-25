## dingtalk-bot-inbound

### 概述
接收钉钉 Outgoing Webhook 推送的 @bot 消息，验证签名，解析为标准 BotMessage 结构。

### 接口

**HTTP Endpoint**: `POST /api/bot/dingtalk`

**请求格式** (钉钉 Outgoing Webhook 推送):
```json
{
  "msgtype": "text",
  "text": { "content": " 查看状态" },
  "msgId": "xxxx",
  "createAt": 1711123456789,
  "conversationType": "2",
  "conversationId": "cidXXX",
  "conversationTitle": "项目群",
  "senderId": "dingtalk_userid",
  "senderNick": "张三",
  "senderCorpId": "corpid",
  "senderStaffId": "staffid",
  "chatbotUserId": "chatbot_userid",
  "atUsers": [{"dingtalkId": "chatbot_userid"}],
  "isAdmin": false,
  "sessionWebhookExpiredTime": 1711127000000,
  "sessionWebhook": "https://oapi.dingtalk.com/robot/sendBySession/..."
}
```

**签名验证**:
- 从 HTTP header 取 `timestamp` 和 `sign`
- 计算: `Base64(HmacSHA256(timestamp + "\n" + appSecret, appSecret))`
- 对比 `sign` 一致则放行
- 时间戳偏差超过 1 小时拒绝

### 行为要求

- [ ] 签名验证失败返回 HTTP 403，body: `{"msgtype":"text","text":{"content":"签名验证失败"}}`
- [ ] bot 未启用时返回 HTTP 200，body: `{"msgtype":"text","text":{"content":"机器人未启用"}}`
- [ ] 仅处理 `msgtype: "text"` 类型消息
- [ ] 去除消息内容中的 @bot 文本（前导空格也去除）
- [ ] 解析为 BotMessage 并交给命令路由器处理
- [ ] 回复通过 HTTP response body 同步返回（钉钉 Outgoing 模式）
- [ ] 响应格式: `{"msgtype":"text","text":{"content":"回复内容"}}` 或 markdown 格式
