// ===== 全局常量 =====

export const STATUS = {
  pending: { key: 'pending', label: '待筛选', cls: 'status-pending', icon: '○' },
  saved: { key: 'saved', label: '已收藏', cls: 'status-saved', icon: '★' },
  verifying: { key: 'verifying', label: '待核实', cls: 'status-verifying', icon: '?' },
  writing: { key: 'writing', label: '写作中', cls: 'status-writing', icon: '✎' },
  published: { key: 'published', label: '已发布', cls: 'status-published', icon: '✓' },
  ignored: { key: 'ignored', label: '已忽略', cls: 'status-ignored', icon: '✕' },
};
export const STATUS_ORDER = ['pending', 'saved', 'verifying', 'writing', 'published', 'ignored'];

export const DOMAINS = [
  '知识产权', '数据与隐私', '人工智能', '劳动法', '公司法',
  '国际贸易', '刑事司法', '反垄断', '金融监管', '环境法',
  '国际仲裁', '宪法行政法',
];

export const SCORE_DIMS = [
  { key: 'legalRelevance', label: '法律相关度' },
  { key: 'englishValue', label: '英语学习价值' },
  { key: 'timeliness', label: '时效性' },
  { key: 'readerInterest', label: '目标读者兴趣' },
  { key: 'writeability', label: '内容可写性' },
  { key: 'sourceCredibility', label: '来源可信度' },
];

export const DEFAULT_WEIGHTS = {
  legalRelevance: 1.2,
  englishValue: 1.0,
  timeliness: 0.8,
  readerInterest: 0.9,
  writeability: 0.7,
  sourceCredibility: 1.0,
};

export const PLATFORMS = {
  xiaohongshu: { key: 'xiaohongshu', label: '小红书', color: '#ff2742' },
  wechat: { key: 'wechat', label: '微信公众号', color: '#07c160' },
};

export const LANGS = {
  en: 'English',
  zh: '中文',
  'zh-en': '中英双语',
};

export const SOURCE_TYPES = {
  rss: 'RSS',
  api: 'API',
  website: '官网抓取',
  official: '官方公告',
  manual: '手动录入',
};

export const DEMO_NOTICE = '以下为演示数据，仅用于展示产品能力，并非实时新闻。';
