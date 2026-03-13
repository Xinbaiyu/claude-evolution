#!/usr/bin/env node

/**
 * 配置 claude-evolution 使用 claude-code-router
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const configPath = path.join(os.homedir(), '.claude-evolution/config.json');

async function configureRouter() {
  console.log('🔧 配置 claude-evolution 使用 claude-code-router...\n');

  try {
    // 读取配置
    const config = await fs.readJSON(configPath);

    // 添加 router 配置
    config.llm.baseURL = 'http://127.0.0.1:3456';

    // 由于 router 的 APIKEY 为空，我们使用任意值（路由器会跳过认证）
    // 但需要有值才能通过 Anthropic SDK 的验证
    console.log('✅ 配置更新:');
    console.log('   baseURL: http://127.0.0.1:3456');
    console.log('   模型: ' + config.llm.model);
    console.log('   Prompt Caching: ' + (config.llm.enablePromptCaching ? '启用' : '禁用'));

    // 写回配置
    await fs.writeJSON(configPath, config, { spaces: 2 });

    console.log('\n✅ 配置已保存:', configPath);
    console.log('\n💡 使用说明:');
    console.log('   1. 确保 claude-code-router 正在运行 (端口 3456)');
    console.log('   2. 设置环境变量:');
    console.log('      export ANTHROPIC_API_KEY="any-value"  # 可以是任意值');
    console.log('   3. 运行测试:');
    console.log('      node test-api-key.js');
    console.log('   4. 运行分析:');
    console.log('      node dist/cli/index.js analyze --now');

  } catch (error) {
    console.error('❌ 配置失败:', error.message);
    process.exit(1);
  }
}

configureRouter();
