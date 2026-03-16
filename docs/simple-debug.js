// 简化版诊断脚本 - 直接复制到浏览器控制台执行

// 检查激活的筛选器
const activeBtn = document.querySelector('button[class*="border-purple-500"][class*="text-purple-500"]');
console.log('激活的筛选器:', activeBtn ? activeBtn.textContent.trim() : '未找到');

// 检查卡片数量
const cards = document.querySelectorAll('div[class*="border-4"][class*="border-purple-500"]');
console.log('列表中的卡片数量:', cards.length);

// 检查前10个卡片的信息
console.log('前10个卡片:');
for (let i = 0; i < Math.min(10, cards.length); i++) {
  const card = cards[i];
  const badge = card.querySelector('span[class*="bg-slate-700"]');
  console.log((i + 1) + '. 原因徽章:', badge ? badge.textContent.trim() : '无');
}
