import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { saveConfig, getEvolutionDir, DEFAULT_CONFIG } from '../../config/index.js';
import { logger } from '../../utils/index.js';

/**
 * 初始化 claude-evolution 配置
 */
export async function initCommand(): Promise<void> {
  console.log(chalk.bold.cyan('\n🚀 欢迎使用 Claude Evolution!\n'));

  const evolutionDir = getEvolutionDir();

  // 检查是否已经初始化
  if (await fs.pathExists(path.join(evolutionDir, 'config.json'))) {
    console.log(
      chalk.yellow('⚠️  claude-evolution 已经初始化过了。')
    );
    console.log(
      chalk.gray(`配置目录: ${evolutionDir}`)
    );

    const { createInterface } = await import('readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        chalk.yellow('\n是否要重新初始化? (y/N): '),
        (ans: string) => {
          rl.close();
          resolve(ans.toLowerCase());
        }
      );
    });

    if (answer !== 'y' && answer !== 'yes') {
      console.log(chalk.gray('初始化已取消。'));
      return;
    }

    console.log(chalk.yellow('\n⚠️  将清除现有配置并重新初始化...\n'));
  }

  // 创建目录结构
  console.log(chalk.blue('正在创建目录结构...'));
  await createDirectoryStructure(evolutionDir);
  logger.success('✓ 目录结构创建完成');

  // 迁移现有 CLAUDE.md
  const globalClaudeMd = path.join(os.homedir(), '.claude/CLAUDE.md');
  if (await fs.pathExists(globalClaudeMd)) {
    console.log(chalk.blue('\n检测到现有的 ~/.claude/CLAUDE.md'));
    console.log(chalk.gray('将迁移到 ~/.claude-evolution/source/CORE.md'));

    const content = await fs.readFile(globalClaudeMd, 'utf-8');
    await fs.writeFile(
      path.join(evolutionDir, 'source/CORE.md'),
      content,
      'utf-8'
    );
    logger.success('✓ 已迁移现有配置');
  } else {
    // 创建默认模板
    await createDefaultTemplates(evolutionDir);
    logger.success('✓ 已创建默认配置模板');
  }

  // 询问并保存用户配置
  console.log(chalk.bold.cyan('\n📡 API 配置模式:\n'));
  const apiConfig = await promptForApiMode();

  console.log(chalk.bold.cyan('\n📋 学习阶段配置:\n'));
  const config = await promptForConfig(apiConfig);

  await saveConfig(config);
  logger.success(`✓ 配置已保存到 ${path.join(evolutionDir, 'config.json')}`);

  // 显示下一步提示
  console.log(chalk.bold.green('\n✅ 初始化完成!\n'));
  console.log(chalk.bold('下一步:'));

  // 根据 API 模式显示不同的提示
  if (config.llm.baseURL) {
    // 路由器模式
    console.log(chalk.gray('  1. 确保 claude-code-router 正在运行:'));
    console.log(chalk.cyan(`     curl ${config.llm.baseURL}/api/config`));
    console.log(chalk.gray('  2. 设置环境变量 (任意值即可):'));
    console.log(chalk.cyan('     export ANTHROPIC_API_KEY="test-key"'));
  } else {
    // 标准模式
    console.log(chalk.gray('  1. 设置 Anthropic API Key:'));
    console.log(chalk.cyan('     export ANTHROPIC_API_KEY="sk-ant-xxx..."'));
  }

  console.log(chalk.gray('  ' + (config.llm.baseURL ? '3' : '2') + '. 启动守护进程:'));
  console.log(chalk.cyan('     claude-evolution start --daemon'));
  console.log(chalk.gray('  ' + (config.llm.baseURL ? '4' : '3') + '. 编辑配置模板 (可选 - 推荐使用 Web UI):'));
  console.log(chalk.cyan(`     命令行: ${path.join(evolutionDir, 'source/')}`));
  console.log(chalk.cyan(`     Web UI: http://localhost:10010/source-manager`));
  console.log(chalk.gray('  ' + (config.llm.baseURL ? '5' : '4') + '. 运行首次分析:'));
  console.log(chalk.cyan('     claude-evolution analyze --now'));
  console.log(chalk.gray('  ' + (config.llm.baseURL ? '6' : '5') + '. 或等待定时任务自动运行\n'));
}

/**
 * 创建目录结构
 */
async function createDirectoryStructure(baseDir: string): Promise<void> {
  const dirs = [
    'source',
    'learned',
    'suggestions',
    'output',
    'backups',
    'logs',
  ];

  for (const dir of dirs) {
    await fs.ensureDir(path.join(baseDir, dir));
  }
}

/**
 * 创建默认配置模板
 */
async function createDefaultTemplates(baseDir: string): Promise<void> {
  const sourceDir = path.join(baseDir, 'source');

  // CORE.md
  const coreContent = `# 核心规则

## 编程原则
- 不可变性优先: 总是创建新对象而不是修改现有对象
- 函数式编程: 优先使用纯函数
- 小而专注的函数: 每个函数不超过 50 行

## 错误处理
- 始终使用 try-catch
- 提供有意义的错误信息
- 不要吞没错误
`;

  // STYLE.md
  const styleContent = `# 代码风格

## 命名约定
- 变量: camelCase
- 常量: UPPER_SNAKE_CASE
- 类型: PascalCase

## 格式化
- 使用 Prettier
- 缩进: 2 空格
- 行长: 最大 100 字符
`;

  // CODING.md
  const codingContent = `# 编码实践

## 测试
- TDD: 先写测试
- 最低 80% 覆盖率
- 单元测试 + 集成测试 + E2E 测试

## Git
- 约定式提交: feat, fix, refactor, docs, test
- 小而专注的提交
- 提交前本地测试
`;

  await fs.writeFile(path.join(sourceDir, 'CORE.md'), coreContent, 'utf-8');
  await fs.writeFile(path.join(sourceDir, 'STYLE.md'), styleContent, 'utf-8');
  await fs.writeFile(path.join(sourceDir, 'CODING.md'), codingContent, 'utf-8');
}

/**
 * 询问 API 配置模式
 */
async function promptForApiMode(): Promise<{ baseURL?: string }> {
  const { createInterface } = await import('readline');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer: string) => {
        resolve(answer);
      });
    });
  };

  // 显示选项
  console.log(chalk.gray('请选择您的使用方式:\n'));
  console.log(chalk.white('[1] 标准模式 (推荐)'));
  console.log(chalk.gray('    直接连接 Anthropic API'));
  console.log(chalk.gray('    • 需要: 真实的 Anthropic API Key'));
  console.log(chalk.gray('    • 费用: 按 Anthropic 定价计费\n'));

  console.log(chalk.white('[2] 路由器模式'));
  console.log(chalk.gray('    通过 claude-code-router 转发'));
  console.log(chalk.gray('    • 需要: 路由器运行在 localhost:3456'));
  console.log(chalk.gray('    • 适用: 内部服务或自定义端点\n'));

  const modeAnswer = await question(
    chalk.cyan('您的选择 [1/2]: ') + chalk.gray('(默认: 1) ')
  );

  const mode = modeAnswer.trim() || '1';

  const apiConfig: { baseURL?: string } = {};

  if (mode === '2') {
    // 路由器模式
    console.log(chalk.blue('\n正在验证路由器连接...'));

    const defaultRouterURL = 'http://127.0.0.1:3456';

    // 询问是否使用默认端口
    const customAnswer = await question(
      chalk.cyan('使用默认端口 3456? (Y/n): ')
    );

    let routerURL = defaultRouterURL;

    if (customAnswer.toLowerCase() === 'n') {
      const urlAnswer = await question(
        chalk.cyan('请输入路由器地址 (如 http://localhost:8080): ')
      );
      routerURL = urlAnswer.trim() || defaultRouterURL;
    }

    // 验证路由器连接
    try {
      const response = await fetch(`${routerURL}/api/config`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        logger.success(`✓ 已连接到 claude-code-router (${routerURL})`);
        apiConfig.baseURL = routerURL;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.log(chalk.yellow(`\n⚠️  无法连接到 ${routerURL}`));
      console.log(chalk.gray('\n可能原因:'));
      console.log(chalk.gray('  1. claude-code-router 未启动'));
      console.log(chalk.gray('  2. 端口配置不正确'));

      const continueAnswer = await question(
        chalk.yellow('\n是否继续初始化? (y/N): ')
      );

      if (continueAnswer.toLowerCase() === 'y') {
        console.log(chalk.yellow('⚠️  已保存配置，但请确保启动路由器后再使用\n'));
        apiConfig.baseURL = routerURL;
      } else {
        rl.close();
        console.log(chalk.gray('初始化已取消。'));
        process.exit(0);
      }
    }
  } else {
    // 标准模式
    console.log(chalk.blue('\n✓ 使用标准 Anthropic API'));
    console.log(chalk.gray('请确保设置环境变量: ANTHROPIC_API_KEY\n'));
  }

  rl.close();
  return apiConfig;
}

/**
 * 交互式询问配置
 */
async function promptForConfig(apiConfig: { baseURL?: string }) {
  // 动态导入 readline
  const { createInterface } = await import('readline');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer: string) => {
        resolve(answer);
      });
    });
  };

  // 观察期天数
  const obsAnswer = await question(
    chalk.cyan('观察期天数 (仅收集数据): ') + chalk.gray('(默认: 3) ')
  );
  const observationDays = obsAnswer.trim()
    ? parseInt(obsAnswer)
    : DEFAULT_CONFIG.learningPhases.observation.durationDays;

  // 建议期天数
  const sugAnswer = await question(
    chalk.cyan('建议期天数 (生成建议需确认): ') + chalk.gray('(默认: 4) ')
  );
  const suggestionDays = sugAnswer.trim()
    ? parseInt(sugAnswer)
    : DEFAULT_CONFIG.learningPhases.suggestion.durationDays;

  // 自动应用置信度阈值
  const confAnswer = await question(
    chalk.cyan('自动应用的置信度阈值 (0-1): ') + chalk.gray('(默认: 0.8) ')
  );
  const confidenceThreshold = confAnswer.trim()
    ? parseFloat(confAnswer)
    : DEFAULT_CONFIG.learningPhases.automatic.confidenceThreshold;

  console.log(chalk.bold.cyan('\n⏰ 调度配置:\n'));

  // 调度模式选择
  console.log(chalk.gray('请选择调度模式:\n'));
  console.log(chalk.white('[1] 每 24 小时'));
  console.log(chalk.white('[2] 每 12 小时'));
  console.log(chalk.white('[3] 每 6 小时'));
  console.log(chalk.white('[4] 定时模式 (指定每天的具体时间)\n'));

  const modeAnswer = await question(
    chalk.cyan('您的选择 [1/2/3/4]: ') + chalk.gray('(默认: 1) ')
  );

  let interval = '24h';
  let scheduleTimes: string[] | undefined;

  const modeChoice = modeAnswer.trim() || '1';
  switch (modeChoice) {
    case '2':
      interval = '12h';
      break;
    case '3':
      interval = '6h';
      break;
    case '4': {
      interval = 'timepoints';
      // 循环直到输入有效的时间点
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      let valid = false;
      while (!valid) {
        const timesAnswer = await question(
          chalk.cyan('请输入分析时间点 (HH:MM格式，逗号分隔): ') + chalk.gray('例如: 06:00, 13:00, 16:00\n> ')
        );
        const times = timesAnswer.split(',').map(t => t.trim()).filter(Boolean);

        if (times.length === 0) {
          console.log(chalk.red('至少需要输入一个时间点'));
          continue;
        }

        if (times.length > 12) {
          console.log(chalk.red('最多支持 12 个时间点'));
          continue;
        }

        const invalidTimes = times.filter(t => !timeRegex.test(t));
        if (invalidTimes.length > 0) {
          console.log(chalk.red(`无效的时间格式: ${invalidTimes.join(', ')} (请使用 HH:MM 格式，如 06:00)`));
          continue;
        }

        scheduleTimes = times.sort();
        valid = true;
        console.log(chalk.green(`✓ 已设置 ${scheduleTimes.length} 个时间点: ${scheduleTimes.join(', ')}`));
      }
      break;
    }
    default:
      interval = '24h';
  }

  rl.close();

  // 合并 API 配置
  const llmConfig = {
    ...DEFAULT_CONFIG.llm,
    ...(apiConfig.baseURL && { baseURL: apiConfig.baseURL }),
  };

  return {
    ...DEFAULT_CONFIG,
    learningPhases: {
      observation: {
        ...DEFAULT_CONFIG.learningPhases.observation,
        durationDays: observationDays,
      },
      suggestion: {
        ...DEFAULT_CONFIG.learningPhases.suggestion,
        durationDays: suggestionDays,
      },
      automatic: {
        ...DEFAULT_CONFIG.learningPhases.automatic,
        confidenceThreshold,
      },
    },
    scheduler: {
      ...DEFAULT_CONFIG.scheduler,
      interval,
      ...(scheduleTimes && { scheduleTimes }),
    },
    llm: llmConfig,
  };
}
