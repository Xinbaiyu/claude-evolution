#!/usr/bin/env node

/**
 * 修复配置文件中的模型名称
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const configPath = path.join(os.homedir(), '.claude-evolution/config.json');

async function fixModelName() {
  console.log('🔧 修复配置文件中的模型名称...\n');

  try {
    // 检查配置文件是否存在
    if (!await fs.pathExists(configPath)) {
      console.log('❌ 配置文件不存在，请先运行 init 命令');
      process.exit(1);
    }

    // 读取配置
    const config = await fs.readJSON(configPath);

    console.log('当前模型配置:', config.llm?.model);

    // 修复模型名称
    const oldModel = config.llm?.model;
    let newModel = oldModel;

    const modelMapping = {
      'claude-haiku-4': 'claude-3-5-haiku-20241022',
      'claude-sonnet-4': 'claude-3-5-sonnet-20241022',
      'claude-opus-4': 'claude-opus-4-6',
      'claude-haiku-4-5': 'claude-3-5-haiku-20241022',
      'claude-sonnet-4-6': 'claude-3-5-sonnet-20241022',
      'claude-opus-4-6': 'claude-opus-4-6'
    };

    if (modelMapping[oldModel]) {
      newModel = modelMapping[oldModel];
      config.llm.model = newModel;

      // 写回配置
      await fs.writeJSON(configPath, config, { spaces: 2 });

      console.log('✅ 模型名称已更新:');
      console.log(`   ${oldModel} → ${newModel}`);
      console.log('\n配置文件已保存:', configPath);
    } else {
      console.log('✅ 模型名称已是正确格式:', oldModel);
    }

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  }
}

fixModelName();
