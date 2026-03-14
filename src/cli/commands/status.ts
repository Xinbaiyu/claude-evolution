import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getEvolutionDir } from '../../config/loader.js';
import { loadConfig } from '../../config/index.js';
import { loadPendingSuggestions } from '../../learners/suggestion-manager.js';
import { logger } from '../../utils/index.js';
import { ProcessManager } from '../../daemon/process-manager.js';

/**
 * CLI status 命令
 * 显示系统状态：守护进程、配置、建议、健康检查
 */

export async function statusCommand(): Promise<void> {
  try {
    const evolutionDir = getEvolutionDir();

    console.log(chalk.bold('\n📊 Claude Evolution 状态\n'));
    console.log(chalk.gray('━'.repeat(60)));

    // 1. 守护进程状态 (新增)
    await displayDaemonStatus();

    // 2. 配置状态
    await displayConfigStatus(evolutionDir);

    // 3. 建议统计
    await displaySuggestionsStatus(evolutionDir);

    // 4. 分析状态
    await displayAnalysisStatus(evolutionDir);

    // 5. 系统健康检查
    await displayHealthStatus(evolutionDir);

    console.log(chalk.gray('━'.repeat(60)));
    console.log('');

  } catch (error) {
    logger.error('获取状态失败:', error);
    throw error;
  }
}

/**
 * 显示守护进程状态 (新增)
 */
async function displayDaemonStatus(): Promise<void> {
  console.log(chalk.bold('\n🔧 守护进程'));

  const processManager = new ProcessManager();
  const isRunning = await processManager.isDaemonRunning();

  if (!isRunning) {
    console.log(chalk.gray('  ⏹  未运行'));
    console.log(chalk.cyan('  提示: 运行 `claude-evolution start --daemon` 启动守护进程'));
    return;
  }

  try {
    const pidInfo = await processManager.readPidFile();

    if (!pidInfo) {
      console.log(chalk.red('  ❌ PID 文件读取失败'));
      return;
    }

    // 计算运行时长
    const startTime = new Date(pidInfo.startTime);
    const now = new Date();
    const uptimeMs = now.getTime() - startTime.getTime();
    const uptimeStr = formatUptime(uptimeMs);

    console.log(chalk.green('  ✓ 运行中'));
    console.log(chalk.gray(`  PID: ${pidInfo.pid}`));
    console.log(chalk.gray(`  运行时长: ${uptimeStr}`));
    console.log(chalk.gray(`  启动时间: ${startTime.toLocaleString('zh-CN')}`));

    // Web UI 状态
    if (pidInfo.port) {
      console.log('');
      console.log(chalk.bold('  🌐 Web UI'));
      console.log(chalk.green(`     ✓ http://localhost:${pidInfo.port}`));
    }

    // 调度器状态
    const config = await loadConfig();
    if (config.scheduler?.enabled !== false) {
      console.log('');
      console.log(chalk.bold('  📅 调度器'));
      console.log(chalk.green(`     ✓ 已启动 (每 ${config.scheduler?.interval || '6h'})`));

      // 读取上次执行时间
      const evolutionDir = getEvolutionDir();
      const statusPath = path.join(evolutionDir, 'status.json');
      if (await fs.pathExists(statusPath)) {
        try {
          const status = await fs.readJSON(statusPath);
          if (status.lastAnalysis) {
            const lastTime = new Date(status.lastAnalysis);
            const timeAgo = formatTimeAgo(now.getTime() - lastTime.getTime());
            console.log(chalk.gray(`     上次执行: ${timeAgo}`));

            // 计算下次执行时间（简单估算）
            const intervalHours = parseInt(config.scheduler?.interval || '6') || 6;
            const nextTime = new Date(lastTime.getTime() + intervalHours * 60 * 60 * 1000);
            const timeUntilNext = formatTimeAgo(nextTime.getTime() - now.getTime());
            console.log(chalk.gray(`     下次执行: ${timeUntilNext}`));
          }
        } catch (error) {
          // 忽略 status.json 读取错误
        }
      }
    }

  } catch (error) {
    console.log(chalk.red('  ❌ 状态读取失败'));
    console.log(chalk.gray(`  错误: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * 格式化运行时长
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} 天 ${hours % 24} 小时`;
  } else if (hours > 0) {
    return `${hours} 小时 ${minutes % 60} 分钟`;
  } else if (minutes > 0) {
    return `${minutes} 分钟`;
  } else {
    return `${seconds} 秒`;
  }
}

/**
 * 格式化时间差
 */
function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const isFuture = ms > 0;
  const suffix = isFuture ? '后' : '前';

  if (days > 0) {
    return `${days} 天${suffix}`;
  } else if (hours > 0) {
    return `${hours} 小时${suffix}`;
  } else if (minutes > 0) {
    return `${minutes} 分钟${suffix}`;
  } else {
    return isFuture ? `${seconds} 秒后` : '刚刚';
  }
}

/**
 * 显示配置状态
 */
async function displayConfigStatus(evolutionDir: string): Promise<void> {
  const configPath = path.join(evolutionDir, 'config.json');

  console.log(chalk.bold('\n⚙️  配置状态'));

  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('  ❌ 未初始化 (运行 `claude-evolution init` 初始化)'));
    return;
  }

  try {
    const config = await loadConfig();
    console.log(chalk.green('  ✓ 已初始化'));
    console.log(chalk.gray(`  配置文件: ${configPath}`));
    console.log(chalk.gray(`  LLM 模型: ${config.llm.model}`));
    console.log(chalk.gray(`  学习阶段: 观察 ${config.learningPhases.observation.durationDays} 天 → 建议 ${config.learningPhases.suggestion.durationDays} 天`));
  } catch (error) {
    console.log(chalk.red('  ❌ 配置文件损坏'));
    console.log(chalk.gray(`  错误: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * 显示建议统计
 */
async function displaySuggestionsStatus(evolutionDir: string): Promise<void> {
  console.log(chalk.bold('\n💡 建议统计'));

  const suggestionsDir = path.join(evolutionDir, 'suggestions');

  if (!(await fs.pathExists(suggestionsDir))) {
    console.log(chalk.gray('  暂无建议'));
    return;
  }

  // 统计待审批建议
  const pending = await loadPendingSuggestions();
  const pendingCount = pending.length;

  // 统计已批准建议
  const approvedPath = path.join(suggestionsDir, 'approved.json');
  const approvedCount = (await fs.pathExists(approvedPath))
    ? (await fs.readJSON(approvedPath)).length
    : 0;

  // 统计已拒绝建议
  const rejectedPath = path.join(suggestionsDir, 'rejected.json');
  const rejectedCount = (await fs.pathExists(rejectedPath))
    ? (await fs.readJSON(rejectedPath)).length
    : 0;

  const totalCount = pendingCount + approvedCount + rejectedCount;

  console.log(chalk.gray(`  总计: ${totalCount} 条建议`));

  if (pendingCount > 0) {
    console.log(chalk.yellow(`  ⏳ 待审批: ${pendingCount} 条`));
  } else {
    console.log(chalk.gray(`  ⏳ 待审批: ${pendingCount} 条`));
  }

  console.log(chalk.gray(`  ✓ 已批准: ${approvedCount} 条`));
  console.log(chalk.gray(`  ✗ 已拒绝: ${rejectedCount} 条`));

  if (pendingCount > 0) {
    console.log(chalk.cyan(`\n  提示: 运行 \`claude-evolution review\` 查看待审批建议`));
  }
}

/**
 * 显示分析状态
 */
async function displayAnalysisStatus(evolutionDir: string): Promise<void> {
  console.log(chalk.bold('\n📈 分析状态'));

  const statusPath = path.join(evolutionDir, 'status.json');

  if (!(await fs.pathExists(statusPath))) {
    console.log(chalk.gray('  暂未运行分析'));
    console.log(chalk.cyan(`  提示: 运行 \`claude-evolution analyze --now\` 开始分析`));
    return;
  }

  try {
    const status = await fs.readJSON(statusPath);

    if (status.lastAnalysis) {
      const lastTime = new Date(status.lastAnalysis);
      const now = new Date();
      const diffMs = now.getTime() - lastTime.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      let timeAgo: string;
      if (diffDays > 0) {
        timeAgo = `${diffDays} 天前`;
      } else if (diffHours > 0) {
        timeAgo = `${diffHours} 小时前`;
      } else {
        timeAgo = '刚刚';
      }

      console.log(chalk.green(`  ✓ 上次分析: ${timeAgo}`));
      console.log(chalk.gray(`  时间: ${lastTime.toLocaleString('zh-CN')}`));
    }

    if (status.sessionsAnalyzed !== undefined) {
      console.log(chalk.gray(`  已分析会话: ${status.sessionsAnalyzed} 个`));
    }

  } catch (error) {
    console.log(chalk.red('  ❌ 状态文件损坏'));
  }
}

/**
 * 显示系统健康状态
 */
async function displayHealthStatus(evolutionDir: string): Promise<void> {
  console.log(chalk.bold('\n🏥 系统健康'));

  const requiredDirs = ['source', 'learned', 'suggestions', 'logs'];
  const requiredFiles = ['config.json'];

  let allHealthy = true;

  // 检查必需目录
  for (const dir of requiredDirs) {
    const dirPath = path.join(evolutionDir, dir);
    const exists = await fs.pathExists(dirPath);

    if (exists) {
      console.log(chalk.green(`  ✓ ${dir}/ 目录存在`));
    } else {
      console.log(chalk.red(`  ❌ ${dir}/ 目录缺失`));
      allHealthy = false;
    }
  }

  // 检查必需文件
  for (const file of requiredFiles) {
    const filePath = path.join(evolutionDir, file);
    const exists = await fs.pathExists(filePath);

    if (exists) {
      console.log(chalk.green(`  ✓ ${file} 存在`));
    } else {
      console.log(chalk.red(`  ❌ ${file} 缺失`));
      allHealthy = false;
    }
  }

  // 健康总结
  if (allHealthy) {
    console.log(chalk.green('\n  ✅ 系统健康'));
  } else {
    console.log(chalk.red('\n  ⚠️  系统配置不完整'));
    console.log(chalk.cyan(`  提示: 运行 \`claude-evolution init\` 修复配置`));
  }
}
