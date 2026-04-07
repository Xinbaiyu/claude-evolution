#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { analyzeCommand } from './commands/analyze.js';
import { configListCommand, configSetCommand } from './commands/config.js';
import { configUpgradeCommand } from './commands/config-upgrade.js';
import { statusCommand } from './commands/status.js';
import { diffCommand } from './commands/diff.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { restartCommand } from './commands/restart.js';
import { logsCommand } from './commands/logs.js';
import { installCommand } from './commands/install.js';
import { uninstallCommand } from './commands/uninstall.js';
import { migrateSuggestions } from '../scripts/migrate-suggestions.js';

const program = new Command();

program
  .name('claude-evolution')
  .description('Self-evolution system for Claude Code')
  .version('0.1.0');

// init 命令
program
  .command('init')
  .description('Initialize claude-evolution configuration')
  .action(async () => {
    try {
      await initCommand();
    } catch (error) {
      console.error('初始化失败:', error);
      process.exit(1);
    }
  });

// analyze 命令
program
  .command('analyze')
  .description('Manually trigger analysis')
  .option('--now', 'Run immediately')
  .action(async (options) => {
    try {
      await analyzeCommand(options);
    } catch (error) {
      console.error('分析失败:', error);
      process.exit(1);
    }
  });

// config 命令
const configCmd = program
  .command('config')
  .description('Configuration management');

configCmd
  .command('list')
  .description('List current configuration')
  .action(async () => {
    try {
      await configListCommand();
    } catch (error) {
      console.error('列出配置失败:', error);
      process.exit(1);
    }
  });

configCmd
  .command('set <field> <value>')
  .description('Set a configuration value')
  .action(async (field: string, value: string) => {
    try {
      await configSetCommand(field, value);
    } catch (error) {
      console.error('设置配置失败:', error);
      process.exit(1);
    }
  });

configCmd
  .command('upgrade')
  .description('Upgrade configuration to latest version')
  .action(async () => {
    try {
      await configUpgradeCommand();
    } catch (error) {
      console.error('升级配置失败:', error);
      process.exit(1);
    }
  });

// status 命令
program
  .command('status')
  .description('Show system status')
  .action(async () => {
    try {
      await statusCommand();
    } catch (error) {
      console.error('获取状态失败:', error);
      process.exit(1);
    }
  });

// diff 命令
program
  .command('diff')
  .description('Show configuration differences')
  .option('--no-color', '禁用彩色输出')
  .action(async (options) => {
    try {
      await diffCommand({ noColor: !options.color });
    } catch (error) {
      console.error('生成差异失败:', error);
      process.exit(1);
    }
  });

// ============================================
// Daemon 守护进程命令
// ============================================

// start 命令
program
  .command('start')
  .description('Start the daemon process')
  .option('-d, --daemon', '后台运行')
  .option('-p, --port <port>', 'Web UI 端口', '10010')
  .option('--no-scheduler', '禁用调度器')
  .option('--no-web', '禁用 Web UI')
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        console.error('错误: 端口必须是 1-65535 之间的数字');
        process.exit(1);
      }

      await startCommand({
        daemon: options.daemon,
        port,
        noScheduler: !options.scheduler,
        noWeb: !options.web,
      });
    } catch (error) {
      console.error('启动失败:', error);
      process.exit(1);
    }
  });

// stop 命令
program
  .command('stop')
  .description('Stop the daemon process')
  .option('-f, --force', '强制终止（使用 SIGKILL）')
  .option('-t, --timeout <seconds>', '超时时间（秒）', '30')
  .action(async (options) => {
    try {
      const timeout = parseInt(options.timeout, 10) * 1000;
      if (isNaN(timeout) || timeout <= 0) {
        console.error('错误: 超时时间必须是正整数');
        process.exit(1);
      }

      await stopCommand({
        force: options.force,
        timeout,
      });
    } catch (error) {
      console.error('停止失败:', error);
      process.exit(1);
    }
  });

// restart 命令
program
  .command('restart')
  .description('Restart the daemon process')
  .option('-d, --daemon', '后台运行')
  .option('-p, --port <port>', 'Web UI 端口', '10010')
  .option('--no-scheduler', '禁用调度器')
  .option('--no-web', '禁用 Web UI')
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        console.error('错误: 端口必须是 1-65535 之间的数字');
        process.exit(1);
      }

      await restartCommand({
        daemon: options.daemon,
        port,
        noScheduler: !options.scheduler,
        noWeb: !options.web,
      });
    } catch (error) {
      console.error('重启失败:', error);
      process.exit(1);
    }
  });

// logs 命令
program
  .command('logs')
  .description('View daemon logs')
  .option('-f, --follow', '实时跟踪日志')
  .option('-n, --lines <number>', '显示行数', '50')
  .option('-l, --level <level>', '日志级别过滤 (INFO/WARN/ERROR)')
  .action(async (options) => {
    try {
      const lines = parseInt(options.lines, 10);
      if (isNaN(lines) || lines <= 0) {
        console.error('错误: 行数必须是正整数');
        process.exit(1);
      }

      const level = options.level?.toUpperCase();
      if (level && !['INFO', 'WARN', 'ERROR'].includes(level)) {
        console.error('错误: 日志级别必须是 INFO, WARN 或 ERROR');
        process.exit(1);
      }

      await logsCommand({
        follow: options.follow,
        lines,
        level: level as 'INFO' | 'WARN' | 'ERROR',
      });
    } catch (error) {
      console.error('查看日志失败:', error);
      process.exit(1);
    }
  });

// install 命令
program
  .command('install')
  .description('Install auto-start service')
  .option('--enable', '安装后立即启用')
  .option('-p, --port <port>', 'Web UI 端口', '10010')
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        console.error('错误: 端口必须是 1-65535 之间的数字');
        process.exit(1);
      }

      await installCommand({
        enable: options.enable,
        port,
      });
    } catch (error) {
      console.error('安装失败:', error);
      process.exit(1);
    }
  });

// uninstall 命令
program
  .command('uninstall')
  .description('Uninstall auto-start service')
  .action(async () => {
    try {
      await uninstallCommand();
    } catch (error) {
      console.error('卸载失败:', error);
      process.exit(1);
    }
  });

// migrate-suggestions 命令
program
  .command('migrate-suggestions')
  .description('Migrate v0.2.x pending.json to v0.4.0 active.json (one-time)')
  .action(async () => {
    try {
      console.log('🔄 开始迁移建议数据...\n');

      const result = await migrateSuggestions();

      if (!result.success) {
        console.error(`\n❌ 迁移失败: ${result.error}`);
        process.exit(1);
      }

      if (result.migratedCount === 0) {
        console.log(`ℹ️  ${result.error || '无数据需要迁移'}`);
        process.exit(0);
      }

      console.log(`\n✅ 迁移成功！`);
      console.log(`\n📊 迁移统计:`);
      console.log(`   - 已迁移建议: ${result.migratedCount} 个`);
      console.log(`   - 备份文件: ${result.backupPath}`);
      console.log(`   - 标记文件: ~/.claude-evolution/learned/.migrated`);
      console.log(`\n📝 下一步:`);
      console.log(`   1. 访问 http://localhost:10010/learning-review 查看迁移结果`);
      console.log(`   2. 使用 WebUI 管理观察（代替旧的 CLI 命令）`);
      console.log(`   3. 确认无误后可删除 ~/.claude-evolution/learned/ 目录`);
      console.log(`\n💡 回滚方法:`);
      console.log(`   如需回滚，删除 learned/.migrated 并恢复备份文件`);
    } catch (error) {
      console.error('迁移失败:', error);
      process.exit(1);
    }
  });

program.parse();
