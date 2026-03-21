/**
 * LLM 提示词模板
 * 用于经验提取和模式识别
 */

/**
 * 经验提取的主提示词
 */
export const EXTRACTION_PROMPT = `
你是一个专业的代码会话分析专家。你的任务是分析 Claude Code 的历史会话记录,从中提取用户的偏好、重复出现的问题模式和工作流程。

# 分析目标

从以下会话数据中提取:

1. **用户偏好 (preferences)**: 用户在编程、工作方式、沟通风格等方面的倾向
2. **问题模式 (patterns)**: 重复出现的问题及其最有效的解决方案
3. **工作流程 (workflows)**: 用户固定的操作序列和条件分支流程

# 输出格式

请严格按照以下 JSON 格式输出:

\`\`\`json
{
  "preferences": [
    {
      "type": "style" | "tool" | "development-process" | "communication",
      "description": "简明描述用户偏好",
      "confidence": 0.0-1.0,
      "frequency": <出现次数>,
      "evidence": ["引用1", "引用2"]
    }
  ],
  "patterns": [
    {
      "problem": "问题描述",
      "solution": "解决方案描述",
      "confidence": 0.0-1.0,
      "occurrences": <出现次数>,
      "evidence": ["引用1", "引用2"]
    }
  ],
  "workflows": [
    {
      "name": "工作流名称",
      "steps": ["步骤1", "步骤2", "步骤3"],
      "frequency": <出现次数>,
      "confidence": 0.0-1.0,
      "evidence": ["引用1", "引用2"]
    }
  ]
}
\`\`\`

# 置信度评分标准

- **0.9-1.0**: 明确表达,多次重复,证据充分
- **0.7-0.9**: 多次隐式表现,证据较充分
- **0.5-0.7**: 2-3次出现,证据中等
- **<0.5**: 仅出现1次或证据不足 (不输出)

# 重要规则

1. **只输出 confidence >= 0.5 的项目**
2. **frequency 必须是实际统计的出现次数,不能凭空臆造**
3. **evidence 必须是会话中的真实引用片段**
4. **description/solution 要简洁明了,避免冗长**
5. **如果没有符合条件的项目,相应数组返回空 []**

# 示例

用户在3次会话中都使用了 pnpm 而不是 npm:

\`\`\`json
{
  "preferences": [
    {
      "type": "tool",
      "description": "优先使用 pnpm 作为包管理器",
      "confidence": 0.85,
      "frequency": 3,
      "evidence": [
        "pnpm install lodash",
        "pnpm run build",
        "pnpm test"
      ]
    }
  ]
}
\`\`\`

现在开始分析以下会话数据。
`;

/**
 * 构建完整的分析提示词
 *
 * @param sessionsText - 格式化的观察记录文本
 * @param promptsContext - 可选的用户 prompts 文本 (用于沟通偏好提取)
 */
export function buildAnalysisPrompt(
  sessionsText: string,
  promptsContext?: string | null
): string {
  let prompt = `${EXTRACTION_PROMPT}

# 会话数据

${sessionsText}`;

  // 如果有用户 prompts 上下文,添加到提示词中
  if (promptsContext) {
    prompt += `

# 用户 Prompts 历史 (用于提取沟通偏好)

以下是用户的直接输入历史,可以用来识别沟通风格偏好 (例如: 语言偏好、回答详细程度、确认习惯等):

${promptsContext}

**提示**: 从 prompts 历史中特别关注:
- 语言偏好 (中文/英文)
- 回答风格偏好 (简洁/详细)
- 确认和互动习惯 (是否常说"继续"、"理解了吗"等)
- 元沟通表达 (对交流方式的明确要求)
`;
  }

  prompt += `

# 开始分析

请严格按照上述 JSON 格式输出你的分析结果。确保所有字段都符合要求,特别是 confidence 和 frequency 必须基于实际数据。`;

  return prompt;
}

/**
 * 系统消息 (用于 Anthropic API)
 */
export const SYSTEM_MESSAGE = `你是一个专业的代码会话分析专家。你擅长从开发者的历史会话中识别模式、提取偏好、总结最佳实践。

你的分析必须:
1. 基于证据,不做臆测
2. 量化准确 (频率、置信度)
3. 简洁明了
4. 遵循输出格式

你的目标是帮助开发者从过去的经验中学习,避免重复劳动,提升工作效率。`;
