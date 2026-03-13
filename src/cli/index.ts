#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { analyzeCommand } from './commands/analyze.js';
import { reviewCommand } from './commands/review.js';
import { approveCommand, rejectCommand } from './commands/approve.js';
import { configListCommand, configSetCommand } from './commands/config.js';
import { statusCommand } from './commands/status.js';
import { historyCommand } from './commands/history.js';
import { diffCommand } from './commands/diff.js';

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

// review 命令
program
  .command('review')
  .description('Review pending suggestions')
  .option('-v, --verbose', '显示详细信息（包括证据引用）')
  .action(async (options) => {
    try {
      await reviewCommand(options);
    } catch (error) {
      console.error('查看建议失败:', error);
      process.exit(1);
    }
  });

// approve 命令
program
  .command('approve <id>')
  .description('Approve a suggestion (use "all" to approve all)')
  .action(async (id: string) => {
    try {
      await approveCommand(id);
    } catch (error) {
      console.error('批准失败:', error);
      process.exit(1);
    }
  });

// reject 命令
program
  .command('reject <id>')
  .description('Reject a suggestion')
  .action(async (id: string) => {
    try {
      await rejectCommand(id);
    } catch (error) {
      console.error('拒绝失败:', error);
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

// history 命令
program
  .command('history')
  .description('Show approval/rejection history')
  .option('-l, --limit <number>', '显示数量', '10')
  .option('-t, --type <type>', '过滤类型 (approved/rejected/all)', 'all')
  .action(async (options) => {
    try {
      const limit = parseInt(options.limit, 10);
      const type = options.type;

      if (isNaN(limit) || limit <= 0) {
        console.error('错误: --limit 必须是正整数');
        process.exit(1);
      }

      if (!['approved', 'rejected', 'all'].includes(type)) {
        console.error('错误: --type 必须是 approved, rejected 或 all');
        process.exit(1);
      }

      await historyCommand({ limit, type });
    } catch (error) {
      console.error('查看历史失败:', error);
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

program.parse();
