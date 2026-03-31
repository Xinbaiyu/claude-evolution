import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { saveConfig, getEvolutionDir, DEFAULT_CONFIG } from '../../config/index.js';
import { logger } from '../../utils/index.js';
import type { ActiveProvider, LLMConfig } from '../../config/schema.js';
import { createInterface } from 'readline';

/**
 * 辅助函数：封装 readline 问题提示
 */
async function question(rl: any, prompt: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      const trimmed = answer.trim();
      resolve(trimmed || defaultValue || '');
    });
  });
}

/**
 * P0 配置：LLM Provider 选择
 */
async function promptLLMProvider(rl: any): Promise<LLMConfig> {
  console.log(chalk.bold.cyan('\n📡 LLM Provider 配置\n'));
  console.log(chalk.gray('请选择您使用的 LLM Provider:\n'));

  console.log(chalk.white('[1] Claude Official API (推荐)'));
  console.log(chalk.gray('    → 直接连接 Anthropic API'));
  console.log(chalk.gray('    → 需要 Anthropic API Key (ANTHROPIC_API_KEY)\n'));

  console.log(chalk.white('[2] OpenAI-Compatible API'));
  console.log(chalk.gray('    → 支持 OpenAI、DeepSeek、Qwen、Azure OpenAI 等'));
  console.log(chalk.gray('    → 需要 API Key + Base URL\n'));

  console.log(chalk.white('[3] CCR Proxy'));
  console.log(chalk.gray('    → 通过 claude-code-router 连接'));
  console.log(chalk.gray('    → 需要本地运行 CCR 服务\n'));

  const choice = await question(
    rl,
    chalk.cyan('您的选择 [1/2/3]: ') + chalk.gray('(默认: 1) '),
    '1'
  );

  switch (choice) {
    case '2': {
      // OpenAI-Compatible provider
      console.log(chalk.blue('\n配置 OpenAI-Compatible Provider'));
      const baseURL = await question(
        rl,
        chalk.cyan('Base URL: ') + chalk.gray('(默认: https://api.openai.com) '),
        'https://api.openai.com'
      );
      const model = await question(
        rl,
        chalk.cyan('Model: ') + chalk.gray('(默认: gpt-4-turbo) '),
        'gpt-4-turbo'
      );

      console.log(chalk.gray('\n提示: API Key 请通过环境变量 OPENAI_API_KEY 设置'));

      return {
        activeProvider: 'openai',
        claude: DEFAULT_CONFIG.llm.claude,
        openai: {
          ...DEFAULT_CONFIG.llm.openai,
          baseURL,
          model,
        },
        ccr: DEFAULT_CONFIG.llm.ccr,
      };
    }

    case '3': {
      // CCR Proxy provider
      console.log(chalk.blue('\n配置 CCR Proxy Provider'));
      const baseURL = await question(
        rl,
        chalk.cyan('CCR Base URL: ') + chalk.gray('(默认: http://localhost:3456) '),
        'http://localhost:3456'
      );

      console.log(chalk.gray('\n提示: 请确保 claude-code-router 正在运行'));

      return {
        activeProvider: 'ccr',
        claude: DEFAULT_CONFIG.llm.claude,
        openai: DEFAULT_CONFIG.llm.openai,
        ccr: {
          ...DEFAULT_CONFIG.llm.ccr,
          baseURL,
        },
      };
    }

    default: {
      // Claude Official provider (default)
      console.log(chalk.blue('\n✓ 使用 Claude Official API'));
      console.log(chalk.gray('提示: API Key 请通过环境变量 ANTHROPIC_API_KEY 设置'));

      return {
        activeProvider: 'claude',
        claude: DEFAULT_CONFIG.llm.claude,
        openai: DEFAULT_CONFIG.llm.openai,
        ccr: DEFAULT_CONFIG.llm.ccr,
      };
    }
  }
}

/**
 * P1 配置：Scheduler 时间点输入
 */
async function promptScheduleTimes(rl: any): Promise<string[]> {
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

  while (true) {
    const input = await question(
      rl,
      chalk.cyan('请输入分析时间点 (HH:MM格式，逗号分隔): ') + chalk.gray('例如: 09:00, 13:00, 18:00\n> '),
      ''
    );

    const times = input.split(',').map(t => t.trim()).filter(Boolean);

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
      console.log(chalk.red(`无效的时间格式: ${invalidTimes.join(', ')} (请使用 HH:MM 格式，如 09:00)`));
      continue;
    }

    const sorted = times.sort();
    console.log(chalk.green(`✓ 已设置 ${sorted.length} 个时间点: ${sorted.join(', ')}`));
    return sorted;
  }
}

/**
 * P1 配置：Scheduler 调度配置
 */
async function promptScheduler(rl: any) {
  console.log(chalk.bold.cyan('\n⏰ 学习调度配置\n'));
  console.log(chalk.gray('系统会定期分析 Claude 会话并提取经验。'));
  console.log(chalk.gray('请选择调度模式:\n'));

  console.log(chalk.white('[1] 每 24 小时 - 适合低频使用'));
  console.log(chalk.white('[2] 每 12 小时 - 适合中频使用'));
  console.log(chalk.white('[3] 每 6 小时 (推荐) - 及时响应'));
  console.log(chalk.white('[4] 定时模式 - 指定每天的具体时间点\n'));

  const choice = await question(
    rl,
    chalk.cyan('您的选择 [1/2/3/4]: ') + chalk.gray('(默认: 3) '),
    '3'
  );

  let interval: string;
  let scheduleTimes: string[] | undefined;

  switch (choice) {
    case '1':
      interval = '24h';
      break;
    case '2':
      interval = '12h';
      break;
    case '4':
      interval = 'timepoints';
      scheduleTimes = await promptScheduleTimes(rl);
      break;
    default:
      interval = '6h';
  }

  return {
    ...DEFAULT_CONFIG.scheduler,
    interval,
    ...(scheduleTimes && { scheduleTimes }),
  };
}

/**
 * P1 配置：WebUI 端口配置
 */
async function promptWebUIPort(rl: any) {
  console.log(chalk.bold.cyan('\n🌐 Web UI 配置\n'));

  const portStr = await question(
    rl,
    chalk.cyan('Web UI 端口: ') + chalk.gray('(默认: 10010) '),
    '10010'
  );

  const port = parseInt(portStr, 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    console.log(chalk.yellow('⚠️  无效端口，使用默认值 10010'));
    return { port: 10010 };
  }

  return { port };
}

/**
 * 完成提示：根据 provider 显示不同的下一步指引
 */
function printNextSteps(provider: ActiveProvider, port: number) {
  console.log(chalk.bold.green('\n✅ 初始化完成!\n'));
  console.log(chalk.bold('下一步:\n'));

  // 1. API Key 设置提示
  console.log(chalk.gray('1. 设置 API Key 环境变量:'));
  switch (provider) {
    case 'claude':
      console.log(chalk.cyan('   export ANTHROPIC_API_KEY="sk-ant-xxx..."'));
      break;
    case 'openai':
      console.log(chalk.cyan('   export OPENAI_API_KEY="sk-xxx..."'));
      break;
    case 'ccr':
      console.log(chalk.cyan('   确保 claude-code-router 正在运行'));
      console.log(chalk.cyan('   export ANTHROPIC_API_KEY="test-key"'));
      break;
  }

  // 2. 启动守护进程
  console.log(chalk.gray('\n2. 启动守护进程:'));
  console.log(chalk.cyan('   claude-evolution start'));

  // 3. WebUI 配置引导
  console.log(chalk.gray(`\n3. 打开 Web UI 进行更多配置:`));
  console.log(chalk.cyan(`   http://localhost:${port}/settings\n`));

  console.log(chalk.gray('   可配置项:'));
  console.log(chalk.gray('   • Model 和 Temperature 调优'));
  console.log(chalk.gray('   • 学习容量和算法参数'));
  console.log(chalk.gray('   • 提醒系统 (桌面通知/Webhook)'));
  console.log(chalk.gray('   • 机器人集成 (钉钉/Claude Code)'));
  console.log(chalk.gray('   • 日志级别和其他高级选项\n'));
}

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

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await question(
      rl,
      chalk.yellow('\n是否要重新初始化? (y/N): '),
      'n'
    );

    if (answer !== 'y' && answer !== 'yes') {
      console.log(chalk.gray('初始化已取消。'));
      rl.close();
      return;
    }

    console.log(chalk.yellow('\n⚠️  将清除现有配置并重新初始化...\n'));
    rl.close();
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

  // P0/P1 配置提示
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const llmConfig = await promptLLMProvider(rl);
  const schedulerConfig = await promptScheduler(rl);
  const webUIConfig = await promptWebUIPort(rl);

  rl.close();

  // 合并配置
  const config = {
    ...DEFAULT_CONFIG,
    llm: llmConfig,
    scheduler: schedulerConfig,
    webUI: {
      ...DEFAULT_CONFIG.webUI!,
      port: webUIConfig.port,
    },
  };

  await saveConfig(config);
  logger.success(`✓ 配置已保存到 ${path.join(evolutionDir, 'config.json')}`);

  // 安装 Skill 文件
  await installSkillFiles();

  // 显示下一步提示
  printNextSteps(llmConfig.activeProvider, webUIConfig.port);
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
 * 安装 Skill 文件到 ~/.claude/skills/
 */
async function installSkillFiles(): Promise<void> {
  const targetDir = path.join(os.homedir(), '.claude', 'skills', 'remind');
  const targetPath = path.join(targetDir, 'SKILL.md');

  // Check if user has a custom (unversioned) skill file
  if (await fs.pathExists(targetPath)) {
    const content = await fs.readFile(targetPath, 'utf-8');
    if (!content.includes('name: remind')) {
      console.log(chalk.yellow('⚠️  跳过 Skill 安装：检测到用户自定义的 remind skill'));
      return;
    }
  }

  // Copy skill file from project's skills/ directory
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const sourcePath = path.join(__dirname, '../../../skills/remind/SKILL.md');

  if (await fs.pathExists(sourcePath)) {
    await fs.ensureDir(targetDir);
    await fs.copyFile(sourcePath, targetPath);
    logger.success('✓ Skill 文件已安装: ~/.claude/skills/remind/SKILL.md');
  } else {
    console.log(chalk.yellow('⚠️  Skill 源文件未找到，跳过安装'));
  }
}
