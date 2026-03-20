const res = await fetch('http://127.0.0.1:3456/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'dummy-key-for-local-proxy',
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 100,
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content: '说你好',
      },
    ],
  }),
})

const data = await res.json()
console.log('状态码:', res.status)
console.log('实际模型:', data.model)
console.log('响应:', JSON.stringify(data, null, 2))
