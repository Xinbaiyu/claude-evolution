#!/usr/bin/env node

/**
 * 测试 API Key 是否有效
 */

import Anthropic from '@anthropic-ai/sdk';

async function testApiKey() {
  console.log('🔑 测试 Anthropic API Key...\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ 缺少 ANTHROPIC_API_KEY 环境变量');
    console.error('\n请设置:');
    console.error('  export ANTHROPIC_API_KEY="your-api-key"');
    process.exit(1);
  }

  console.log('✅ API Key 已设置');
  console.log(`   长度: ${apiKey.length} 字符`);
  console.log(`   前缀: ${apiKey.substring(0, 10)}...`);

  try {
    console.log('\n🧪 测试 API 调用...');

    // 支持自定义 baseURL（从环境变量读取）
    const clientOptions = { apiKey };
    const customBaseURL = process.env.ANTHROPIC_BASE_URL;

    if (customBaseURL) {
      clientOptions.baseURL = customBaseURL;
      console.log(`   使用自定义端点: ${customBaseURL}`);
    }

    const anthropic = new Anthropic(clientOptions);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'Say "API test successful" in Chinese.' }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      console.log('✅ API 调用成功!');
      console.log(`   响应: ${content.text}`);
      console.log(`   模型: ${response.model}`);
      console.log(`   使用 tokens: ${response.usage.input_tokens} input + ${response.usage.output_tokens} output`);
    }

  } catch (error) {
    console.error('\n❌ API 调用失败:', error.message);

    if (error.status === 401) {
      console.error('\n原因: API Key 无效或已过期');
      console.error('解决: 请检查你的 API Key 是否正确');
    } else if (error.status === 403) {
      console.error('\n原因: API Key 权限不足或请求被拒绝');
      console.error('可能原因:');
      console.error('  1. API Key 不支持所选模型');
      console.error('  2. 账户余额不足');
      console.error('  3. 请求违反了使用政策');
    } else if (error.status === 429) {
      console.error('\n原因: 请求过于频繁或超出配额');
    } else {
      console.error('\n详细错误:', error);
    }

    process.exit(1);
  }
}

testApiKey();
