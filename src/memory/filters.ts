/**
 * 敏感数据过滤器
 * 用于在处理会话数据前移除敏感信息
 */

/**
 * 预定义的敏感数据模式
 */
const SENSITIVE_PATTERNS = [
  // API Keys
  /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
  /sk-ant-[a-zA-Z0-9-_]{95,}/g, // Anthropic API keys
  /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
  /gho_[a-zA-Z0-9]{36}/g, // GitHub OAuth tokens
  /xoxb-[0-9]{10,}-[a-zA-Z0-9]+/g, // Slack bot tokens
  /xoxp-[0-9]{10,}-[a-zA-Z0-9]+/g, // Slack user tokens

  // Google API keys
  /AIza[0-9A-Za-z-_]{35}/g,

  // AWS
  /AKIA[0-9A-Z]{16}/g, // AWS Access Key ID

  // JWT tokens
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,

  // Password patterns
  /password[:\s=]+['"]?[^\s'"]+['"]?/gi,
  /passwd[:\s=]+['"]?[^\s'"]+['"]?/gi,
  /pwd[:\s=]+['"]?[^\s'"]+['"]?/gi,

  // Email addresses (可选,根据需求启用)
  // /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // IP addresses (内网地址)
  /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\b172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b/g,
  /\b192\.168\.\d{1,3}\.\d{1,3}\b/g,

  // Common secret environment variable patterns
  /[A-Z_]+_SECRET[:\s=]+['"]?[^\s'"]+['"]?/gi,
  /[A-Z_]+_TOKEN[:\s=]+['"]?[^\s'"]+['"]?/gi,
  /[A-Z_]+_KEY[:\s=]+['"]?[^\s'"]+['"]?/gi,
];

/**
 * 过滤敏感数据
 */
export function filterSensitiveData(
  content: string,
  customBlacklist: string[] = []
): string {
  let filtered = content;

  // 应用预定义模式
  for (const pattern of SENSITIVE_PATTERNS) {
    filtered = filtered.replace(pattern, '[REDACTED]');
  }

  // 应用用户自定义黑名单
  for (const keyword of customBlacklist) {
    try {
      const regex = new RegExp(keyword, 'gi');
      filtered = filtered.replace(regex, '[REDACTED]');
    } catch (error) {
      console.warn(`无效的正则表达式: ${keyword}`, error);
    }
  }

  return filtered;
}

/**
 * 批量过滤敏感数据
 */
export function filterSensitiveDataBatch(
  contents: string[],
  customBlacklist: string[] = []
): string[] {
  return contents.map((content) => filterSensitiveData(content, customBlacklist));
}

/**
 * 检查文本是否包含敏感数据
 */
export function containsSensitiveData(
  content: string,
  customBlacklist: string[] = []
): boolean {
  // 检查预定义模式
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      return true;
    }
  }

  // 检查自定义黑名单
  for (const keyword of customBlacklist) {
    try {
      const regex = new RegExp(keyword, 'gi');
      if (regex.test(content)) {
        return true;
      }
    } catch (error) {
      console.warn(`无效的正则表达式: ${keyword}`, error);
    }
  }

  return false;
}

/**
 * 统计过滤掉的敏感数据数量
 */
export function countSensitiveData(
  content: string,
  customBlacklist: string[] = []
): { total: number; patterns: Map<string, number> } {
  const patterns = new Map<string, number>();
  let total = 0;

  // 检查预定义模式
  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      const count = matches.length;
      patterns.set(pattern.source, count);
      total += count;
    }
  }

  // 检查自定义黑名单
  for (const keyword of customBlacklist) {
    try {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      if (matches) {
        const count = matches.length;
        patterns.set(`custom:${keyword}`, count);
        total += count;
      }
    } catch (error) {
      console.warn(`无效的正则表达式: ${keyword}`, error);
    }
  }

  return { total, patterns };
}
