import fs from 'fs-extra';
import path from 'path';
import { getEvolutionDir } from '../config/loader.js';
import { SystemState } from '../types/index.js';

/**
 * 获取状态文件路径
 */
function getStatePath(): string {
  return path.join(getEvolutionDir(), 'state.json');
}

/**
 * 加载系统状态
 */
async function loadState(): Promise<SystemState> {
  const statePath = getStatePath();

  if (!(await fs.pathExists(statePath))) {
    // 首次运行,创建初始状态
    const initialState: SystemState = {
      installDate: new Date().toISOString(),
      lastAnalysisTime: null,
      lastAnalysisSuccess: false,
      totalAnalyses: 0,
    };
    await saveState(initialState);
    return initialState;
  }

  return fs.readJSON(statePath);
}

/**
 * 保存系统状态
 */
async function saveState(state: SystemState): Promise<void> {
  const statePath = getStatePath();
  await fs.ensureDir(getEvolutionDir());
  await fs.writeJSON(statePath, state, { spaces: 2 });
}

/**
 * 获取上次分析时间
 */
export async function getLastAnalysisTime(): Promise<Date | null> {
  const state = await loadState();
  return state.lastAnalysisTime ? new Date(state.lastAnalysisTime) : null;
}

/**
 * 更新分析状态
 */
export async function updateAfterAnalysis(success: boolean): Promise<void> {
  const state = await loadState();
  state.lastAnalysisTime = new Date().toISOString();
  state.lastAnalysisSuccess = success;
  state.totalAnalyses += 1;
  await saveState(state);
}

/**
 * 获取系统状态
 */
export async function getSystemState(): Promise<SystemState> {
  return loadState();
}
