#!/bin/bash
# 模拟钉钉 @Bot 消息推送到本地 daemon
# 用法: ./test-bot.sh "你要发的消息"

SECRET="SEC1161b71cc33f287893391b4f8da4f85b56484749e957db411158cbcd76e20a4d"
MESSAGE="${1:-帮助}"

TIMESTAMP=$(node -e "console.log(Date.now().toString())")
SIGN=$(node -e "
const crypto = require('crypto');
console.log(crypto.createHmac('sha256', '$SECRET').update('$TIMESTAMP\n$SECRET').digest('base64'));
")

curl -s -X POST http://localhost:10010/api/bot/dingtalk \
  -H "Content-Type: application/json" \
  -H "timestamp: $TIMESTAMP" \
  -H "sign: $SIGN" \
  -d "{
    \"msgtype\": \"text\",
    \"text\": { \"content\": \" $MESSAGE\" },
    \"msgId\": \"test-$(date +%s)\",
    \"conversationType\": \"2\",
    \"conversationId\": \"cid-local-test\",
    \"senderId\": \"uid-test\",
    \"senderNick\": \"本地测试\",
    \"createAt\": $TIMESTAMP,
    \"sessionWebhook\": \"https://httpbin.org/post\"
  }" | node -e "process.stdin.on('data',d=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
