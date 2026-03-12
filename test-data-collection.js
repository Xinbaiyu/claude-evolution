#!/usr/bin/env node

/**
 * 测试数据采集功能（不调用 LLM）
 */

import { createHTTPClient } from './dist/memory/http-client.js';
import { loadConfig } from './dist/config/loader.js';
import { collectRecentSessions } from './dist/analyzers/session-collector.js';
import { getObservationStats } from './dist/analyzers/session-collector.js';

async function testDataCollection() {
  console.log('🔍 测试数据采集功能...\n');

  try {
    // 1. 加载配置
    console.log('1️⃣ 加载配置');
    const config = await loadConfig();
    console.log('✅ 配置加载成功');

    // 2. 连接 HTTP API
    console.log('\n2️⃣ 连接 HTTP API');
    const httpClient = await createHTTPClient();
    console.log('✅ HTTP 客户端连接成功');

    // 3. 采集会话数据
    console.log('\n3️⃣ 采集会话数据');
    const observations = await collectRecentSessions(
      httpClient,
      null, // 从最早开始
      config
    );

    console.log(`✅ 采集成功: ${observations.length} 条记录`);

    if (observations.length > 0) {
      // 显示统计
      const stats = getObservationStats(observations);
      console.log('\n📊 统计信息:');
      console.log(`   总计: ${stats.total} 条`);
      console.log('   类型分布:');
      for (const [type, count] of stats.byType) {
        console.log(`      ${type}: ${count} 条`);
      }
      console.log(`   总 tokens: ${stats.totalTokens}`);

      // 显示样本
      console.log('\n📄 样本数据 (前3条):');
      for (let i = 0; i < Math.min(3, observations.length); i++) {
        const obs = observations[i];
        console.log(`\n   [${i + 1}] ${obs.type.toUpperCase()}: ${obs.title}`);
        console.log(`       时间: ${obs.created_at}`);
        console.log(`       内容: ${obs.narrative.substring(0, 100)}...`);
      }
    }

    // 4. 断开连接
    await httpClient.disconnect();

    console.log('\n✅ 数据采集测试完成!');
    console.log('\n💡 下一步: 设置 ANTHROPIC_API_KEY 后运行完整分析');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('\n堆栈跟踪:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testDataCollection();
