/**
 * Application Constants
 * Centralized constant definitions to avoid magic strings and hardcoded values
 */

// API Endpoints
export const API_ENDPOINTS = {
  PROMPTS: '/api/prompts',
  PROMPTS_BY_ID: (id: string) => `/api/prompts/${id}`,
  TAGS: '/api/tags',
  MODEL_TAGS: '/api/model-tags',
  CATEGORIES: '/api/categories',
  INIT_CATEGORIES: '/api/init-categories',
  INIT_MODEL_TAGS: '/api/init-model-tags',
  IMPORT: '/api/import',
  IMPORT_CSV: '/api/import/csv',
  IMPORT_FEISHU: '/api/import/feishu',
} as const;

// Default Categories (生成类型)
export const DEFAULT_CATEGORIES = ['文生图', '文生视频', '文生音频', '图像修复', '发现更多'] as const;
export const DEFAULT_CATEGORY = '文生图' as const;

// Default AI Model Tags (AI模型标签)
export const DEFAULT_MODEL_TAGS = [
  { name: 'Midjourney', type: '文生图', color: '#5865F2' },
  { name: 'DALL-E 3', type: '文生图', color: '#10A37F' },
  { name: 'Stable Diffusion', type: '文生图', color: '#A855F7' },
  { name: 'Flux', type: '文生图', color: '#EC4899' },
  { name: 'Leonardo.AI', type: '文生图', color: '#F97316' },
  { name: 'ComfyUI', type: '文生图', color: '#22C55E' },
  { name: 'Runway', type: '文生视频', color: '#3B82F6' },
  { name: 'Sora', type: '文生视频', color: '#000000' },
  { name: 'Pika', type: '文生视频', color: '#8B5CF6' },
  { name: 'Kling', type: '文生视频', color: '#FF6B35' },
  { name: 'Suno', type: '文生音频', color: '#FACC15' },
  { name: 'Udio', type: '文生音频', color: '#06B6D4' },
  { name: 'DeepSeek', type: '多模态', color: '#2563EB' },
  { name: 'Banana', type: '其他', color: '#FBBF24' },
  { name: '其他模型', type: '通用', color: '#6B7280' },
] as const;

// Default Values
export const DEFAULTS = {
  FEISHU_URL: 'https://u55dyuejxc.feishu.cn/wiki/S5nowuX3uiHXq4kNPb3c7cPpngh?table=tblJT29vyAEQmZzq&view=vewBBRuwm1',
  IMPORT_MODE: 'merge' as const,
  CSV_PREVIEW_LENGTH: 1000,
  PAGE_SIZE: 12, // Default items per page for frontend
  PAGE_SIZE_OPTIONS: [6, 12, 24, 48], // Available page size options
} as const;

// Messages
export const MESSAGES = {
  SUCCESS: {
    IMPORT: (count: number) => `成功导入 ${count} 条数据！`,
    IMPORT_CSV: (total: number, imported: number) => 
      `成功解析 ${total} 条，导入 ${imported} 条有效数据！`,
    CREATE: '创建成功！',
    UPDATE: '更新成功！',
    DELETE: '删除成功！',
  },
  ERROR: {
    IMPORT: '导入失败',
    IMPORT_FEISHU_AUTH: '文档需要认证。请提供 Cookie 或使用手动导入方式。',
    IMPORT_CSV_PARSE: 'CSV解析失败',
    IMPORT_JSON_FORMAT: 'JSON 格式错误：必须是数组',
    IMPORT_JSON_SYNTAX: (msg: string) => `JSON 格式错误：${msg}`,
    IMPORT_CSV_REQUIRED: '请选择CSV文件或粘贴CSV内容',
    IMPORT_FILE_READ: (msg: string) => `文件读取失败：${msg}`,
    CREATE: '创建失败',
    UPDATE: '更新失败',
    DELETE: '删除失败',
    FETCH: '获取数据失败',
    NETWORK: (msg: string) => `请求失败：${msg}`,
    UNKNOWN: '未知错误',
  },
  LOADING: {
    IMPORT: '导入中...',
    SAVE: '保存中...',
  },
} as const;

// File Upload
export const FILE_UPLOAD = {
  CSV_ACCEPT: '.csv,.txt',
  CSV_PREVIEW_TRUNCATE_SUFFIX: '\n...(已截取前1000字符)',
} as const;

// UI Text
export const UI_TEXT = {
  EMPTY_STATE: {
    TITLE: '暂无数据',
    DESCRIPTION: '点击"新建提示词"开始添加',
  },
  PLACEHOLDER: {
    EFFECT: '例如：生成产品介绍文案',
    DESCRIPTION: '详细描述该提示词的用途和特点',
    TAGS: '例如：营销, 文案, 创意',
    PROMPT: '输入完整的提示词内容',
    SOURCE: '例如：https://example.com',
    IMAGE_URL: 'https://example.com/image.jpg',
    FEISHU_URL: 'https://xxx.feishu.cn/wiki/...',
    COOKIE: '从浏览器开发者工具中复制 Cookie...',
    CSV: 'CSV 内容将在此显示...',
    JSON: `[\n  {\n    "效果": "示例标题",\n    "描述": "示例描述",\n    "标签": "标签1,标签2",\n    "提示词": "示例提示词",\n    "来源": "https://example.com"\n  }\n]`,
  },
} as const;

// Data Storage
export const STORAGE = {
  DATA_DIR: 'data',
  PROMPTS_FILE: 'prompts.json',
} as const;

// Admin Access Control
export const ADMIN_CONFIG = {
  // Whether to show admin entry by default
  SHOW_ADMIN_ENTRY: process.env.NEXT_PUBLIC_SHOW_ADMIN_ENTRY !== 'false',
  // Allowed domains for admin access (empty array means all domains allowed)
  ALLOWED_DOMAINS: (process.env.NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS || '')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean),
} as const;

