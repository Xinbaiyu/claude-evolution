#!/usr/bin/env node

/**
 * claude-mem HTTP API 测试脚本
 * 验证 Worker Service 可用性和数据访问
 */

const baseUrl = 'http://localhost:37777';

async function testConnection() {
  console.log('🔍 测试 claude-mem HTTP API 连接...\n');

  try {
    // 1. 测试服务可用性
    console.log('1️⃣ 测试服务可用性');
    const statsResponse = await fetch(`${baseUrl}/api/stats`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!statsResponse.ok) {
      throw new Error(`HTTP ${statsResponse.status}: ${statsResponse.statusText}`);
    }

    const stats = await statsResponse.json();
    console.log('✅ 服务正常');
    console.log('   📊 统计信息:');
    console.log(`      - 总观察数: ${stats.total_observations || 0}`);
    console.log(`      - 总项目数: ${stats.total_projects || 0}`);
    if (stats.by_type) {
      console.log('      - 类型分布:');
      for (const [type, count] of Object.entries(stats.by_type)) {
        console.log(`          ${type}: ${count}`);
      }
    }

    // 2. 测试查询 observations
    console.log('\n2️⃣ 测试查询 observations (最近10条)');
    const obsResponse = await fetch(`${baseUrl}/api/observations?limit=10`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!obsResponse.ok) {
      throw new Error(`HTTP ${obsResponse.status}: ${obsResponse.statusText}`);
    }

    const observations = await obsResponse.json();
    const obsList = Array.isArray(observations)
      ? observations
      : (observations.items || observations.observations || observations.data || []);

    console.log(`✅ 查询成功,返回 ${obsList.length} 条记录`);

    if (obsList.length > 0) {
      const sample = obsList[0];
      console.log('   📄 样本数据结构:');
      console.log(`      - id: ${sample.id}`);
      console.log(`      - type: ${sample.type}`);
      console.log(`      - title: ${sample.title?.substring(0, 50)}...`);
      console.log(`      - created_at: ${sample.created_at}`);
    }

    // 3. 测试时间范围查询
    console.log('\n3️⃣ 测试时间范围查询 (最近24小时)');
    const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const timeRangeResponse = await fetch(
      `${baseUrl}/api/observations?created_at_start=${oneDayAgo}&limit=50`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!timeRangeResponse.ok) {
      throw new Error(`HTTP ${timeRangeResponse.status}: ${timeRangeResponse.statusText}`);
    }

    const recentObs = await timeRangeResponse.json();
    const recentList = Array.isArray(recentObs)
      ? recentObs
      : (recentObs.items || recentObs.observations || recentObs.data || []);

    console.log(`✅ 最近24小时有 ${recentList.length} 条记录`);

    // 4. 测试类型过滤
    console.log('\n4️⃣ 测试类型过滤 (feature,bugfix,refactor)');
    const typeResponse = await fetch(
      `${baseUrl}/api/observations?type=feature,bugfix,refactor&limit=20`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!typeResponse.ok) {
      throw new Error(`HTTP ${typeResponse.status}: ${typeResponse.statusText}`);
    }

    const typedObs = await typeResponse.json();
    const typedList = Array.isArray(typedObs)
      ? typedObs
      : (typedObs.items || typedObs.observations || typedObs.data || []);

    console.log(`✅ 符合类型的记录: ${typedList.length} 条`);

    const typeCounts = {};
    for (const obs of typedList) {
      typeCounts[obs.type] = (typeCounts[obs.type] || 0) + 1;
    }
    console.log('   📊 类型统计:');
    for (const [type, count] of Object.entries(typeCounts)) {
      console.log(`      ${type}: ${count}`);
    }

    // 总结
    console.log('\n✅ 所有测试通过!');
    console.log('\n💡 claude-mem HTTP API 运行正常,可以继续配置 claude-evolution');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n故障排查:');
    console.error('  1. 检查 claude-mem Worker Service 是否运行');
    console.error('  2. 验证端口 37777 未被占用');
    console.error('  3. 查看 claude-mem 日志');
    console.error('\n手动测试命令:');
    console.error(`  curl ${baseUrl}/api/stats`);
    process.exit(1);
  }
}

// 运行测试
testConnection();
