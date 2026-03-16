// 归档池筛选诊断工具
// 在浏览器控制台（F12 → Console）执行这段代码

console.log('=== 归档池筛选诊断 ===\n');

// 1. 检查当前激活的筛选器
const activeFilter = document.querySelector('button[class*="border-purple-500"][class*="text-purple-500"]');
console.log('1. 当前激活的筛选器:', activeFilter?.textContent?.trim());

// 2. 检查统计卡片的数字
const statCards = Array.from(document.querySelectorAll('[class*="border-slate-600"][class*="bg-slate-800"] > div'));
const stats = {};
statCards.forEach(card => {
  const label = card.querySelector('.text-slate-400')?.textContent?.trim();
  const value = card.querySelector('[class*="font-black"]')?.textContent?.trim();
  if (label && value) {
    stats[label] = value;
  }
});
console.log('2. 统计卡片数字:', stats);

// 3. 检查实际显示的观察卡片数量
const observationCards = document.querySelectorAll('[class*="border-purple-500/30"], [class*="border-purple-500"][class*="bg-purple-500"]');
console.log('3. 列表中的观察卡片数量:', observationCards.length);

// 4. 检查前10个观察卡片的归档原因
console.log('4. 前10个观察卡片的详情:');
Array.from(observationCards).slice(0, 10).forEach((card, i) => {
  const idElement = card.querySelector('[class*="text-slate-500"][class*="font-mono"]');
  const id = idElement?.textContent?.trim().replace('ID: ', '');

  const reasonBadge = card.querySelector('[class*="bg-slate-700"]');
  const reason = reasonBadge?.textContent?.trim();

  const typeBadge = card.querySelector('[class*="border-purple-500"]');
  const type = typeBadge?.textContent?.trim();

  console.log(`   [${i + 1}] ID: ${id}, 类型: ${type}, 原因: ${reason}`);
});

// 5. 如果数量不匹配，说明有问题
if (stats['已忽略'] && observationCards.length !== parseInt(stats['已忽略'])) {
  console.warn(`⚠️ 发现不一致！统计显示 ${stats['已忽略']} 个，但列表显示 ${observationCards.length} 个`);
} else {
  console.log('✅ 统计数字和列表数量一致');
}

// 6. 检查是否有重复ID
const ids = Array.from(observationCards).map(card => {
  const idElement = card.querySelector('[class*="text-slate-500"][class*="font-mono"]');
  return idElement?.textContent?.trim().replace('ID: ', '');
});
const uniqueIds = new Set(ids);
if (ids.length !== uniqueIds.size) {
  console.warn(`⚠️ 发现重复观察！总数: ${ids.length}, 唯一: ${uniqueIds.size}`);
} else {
  console.log('✅ 没有重复观察');
}

console.log('\n=== 诊断完成 ===');
