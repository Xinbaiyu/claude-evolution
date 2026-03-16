import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { getEvolutionDir } from '../../../src/config/loader.js';
import { regenerateClaudeMd } from '../../../src/memory/claudemd-generator.js';
import { loadContextObservations } from '../../../src/memory/observation-manager.js';

const router = Router();

const EVOLUTION_DIR = getEvolutionDir();
const SOURCE_DIR = path.join(EVOLUTION_DIR, 'source');
const OUTPUT_DIR = path.join(EVOLUTION_DIR, 'output');
const CLAUDE_MD_PATH = path.join(OUTPUT_DIR, 'CLAUDE.md');

// GET /api/source/files - 获取 source 文件列表
router.get('/files', async (req, res) => {
  try {
    // 确保目录存在
    if (!(await fs.pathExists(SOURCE_DIR))) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // 读取所有 .md 文件
    const files = await fs.readdir(SOURCE_DIR);
    const mdFiles = files
      .filter((f) => f.endsWith('.md'))
      .sort(); // 按字母顺序排序

    res.json({
      success: true,
      data: mdFiles,
    });
  } catch (error) {
    console.error('[API] 获取文件列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/source/files/:filename - 读取文件内容
router.get('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
      });
    }

    // 确保是 .md 文件
    if (!filename.endsWith('.md')) {
      return res.status(400).json({
        success: false,
        error: 'Only .md files are allowed',
      });
    }

    const filePath = path.join(SOURCE_DIR, filename);

    // 检查文件是否存在
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    // 读取文件内容
    const content = await fs.readFile(filePath, 'utf-8');

    res.json({
      success: true,
      data: {
        filename,
        content,
      },
    });
  } catch (error) {
    console.error('[API] 读取文件失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/source/files/:filename - 保存文件并触发重新生成
router.put('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { content } = req.body;

    // 参数校验
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content is required and must be a string',
      });
    }

    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
      });
    }

    // 确保是 .md 文件
    if (!filename.endsWith('.md')) {
      return res.status(400).json({
        success: false,
        error: 'Only .md files are allowed',
      });
    }

    const filePath = path.join(SOURCE_DIR, filename);

    // 确保 source 目录存在
    await fs.ensureDir(SOURCE_DIR);

    // 保存文件
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[API] 文件已保存: ${filename}`);

    // 触发 CLAUDE.md 重新生成（使用新的生成器）
    console.log('[API] 开始重新生成 CLAUDE.md...');

    // 加载 context pool 观察
    const contextObservations = await loadContextObservations();
    console.log(`[API] 加载了 ${contextObservations.length} 个上下文观察`);

    // 调用生成器（传入观察数组）
    await regenerateClaudeMd(contextObservations);
    console.log('[API] CLAUDE.md 重新生成完成');

    res.json({
      success: true,
      data: {
        filename,
        message: 'File saved and CLAUDE.md regenerated',
      },
    });
  } catch (error) {
    console.error('[API] 保存文件失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/source/claude-md - 获取最终 CLAUDE.md 内容
router.get('/claude-md', async (req, res) => {
  try {
    // 检查文件是否存在
    if (!(await fs.pathExists(CLAUDE_MD_PATH))) {
      return res.status(404).json({
        success: false,
        error: 'CLAUDE.md not found. Please run analysis first.',
      });
    }

    // 读取文件内容
    const content = await fs.readFile(CLAUDE_MD_PATH, 'utf-8');

    res.json({
      success: true,
      data: {
        content,
      },
    });
  } catch (error) {
    console.error('[API] 读取 CLAUDE.md 失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
