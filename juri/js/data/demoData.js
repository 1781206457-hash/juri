// ===== 演示数据（明确标注，非实时新闻）=====
// 数据均为模拟生成，用于展示产品能力。真实接入时由 sourceFetcher 替换。

import { uid } from '../utils.js';

function d(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  dt.setHours(9 + (days % 8), (days * 7) % 60, 0, 0);
  return dt.toISOString();
}

export const demoSources = [
  // —————— 真实可接入 RSS（type: 'rss' / 'official'，拉取时走 CORS 代理）——————
  {
    id: 'src_bbc', name: 'BBC News - World', type: 'rss',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    enabled: true, lang: 'en', category: '权威媒体',
    desc: 'BBC 世界新闻 RSS 2.0，每 15 分钟更新。',
    lastFetchedAt: null,
  },
  {
    id: 'src_cnn', name: 'CNN Top Stories', type: 'rss',
    url: 'https://rss.cnn.com/rss/cnn_topstories.rss',
    enabled: true, lang: 'en', category: '权威媒体',
    desc: 'CNN 头条新闻 RSS，覆盖美国与国际重大事件。',
    lastFetchedAt: null,
  },
  {
    id: 'src_reuters_world', name: 'Reuters World', type: 'rss',
    url: 'https://feeds.reuters.com/Reuters/worldNews',
    enabled: true, lang: 'en', category: '权威媒体',
    desc: '路透社国际新闻 RSS，侧重政治、经济与监管。',
    lastFetchedAt: null,
  },
  {
    id: 'src_ft_world', name: 'Financial Times - World', type: 'rss',
    url: 'https://www.ft.com/?format=rss',
    enabled: true, lang: 'en', category: '财经媒体',
    desc: '金融时报全球新闻 RSS。',
    lastFetchedAt: null,
  },
  {
    id: 'src_npr_law', name: 'NPR - Law', type: 'rss',
    url: 'https://feeds.npr.org/1089/rss.xml',
    enabled: false, lang: 'en', category: '法律专题',
    desc: 'NPR 法律频道，美国司法与最高法院报道。',
    lastFetchedAt: null,
  },
  // —————— 官方/监管站点（official）——————
  {
    id: 'src_wipo', name: 'WIPO News', type: 'official',
    url: 'https://www.wipo.int/portal/en/resources/rss/news.xml',
    enabled: true, lang: 'en', category: '国际组织',
    desc: '世界知识产权组织新闻 RSS。',
    lastFetchedAt: null,
  },
  {
    id: 'src_edpb', name: 'EDPB', type: 'official',
    url: 'https://www.edpb.europa.eu/news/rss_en',
    enabled: true, lang: 'en', category: '监管机构',
    desc: '欧洲数据保护委员会指南与意见 RSS。',
    lastFetchedAt: null,
  },
  // —————— 中文（type: 'website'，暂未实现真实抓取，保留作演示）——————
  {
    id: 'src_court_gov', name: '最高人民法院', type: 'website', url: 'https://www.court.gov.cn/',
    enabled: false, lang: 'zh', category: '法院官网',
    desc: '中国最高人民法院公告与典型案例（暂未接入，待后端抓取）。',
    lastFetchedAt: null,
  },
  {
    id: 'src_pkulaw', name: '北大法宝', type: 'website', url: 'https://www.pkulaw.com/',
    enabled: false, lang: 'zh', category: '中文法律库',
    desc: '中文法律法规与案例库（示例，需合规访问）。',
    lastFetchedAt: null,
  },
];

// 文章 + 关联术语（术语在 terms 字段里，后续会拆成 Term 实体）
export const demoArticles = [
  {
    id: 'art_1', sourceId: 'src_reuters',
    title: 'EU AI Act enters into force, phasing in obligations for high-risk AI systems',
    summary: 'The European Union\'s Artificial Intelligence Act has officially entered into force, imposing a risk-based regulatory framework. Providers of high-risk AI systems in areas such as employment, education, and law enforcement will face conformity assessments, transparency obligations, and human oversight requirements.',
    url: 'https://www.reuters.com/legal/eu-ai-act-enters-into-force',
    publishedAt: d(0), eventAt: d(0), fetchedAt: d(0), lang: 'en',
    domains: ['人工智能', '数据与隐私'],
    parties: ['European Commission', 'AI providers'],
    background: 'The AI Act is the world\'s first comprehensive horizontal AI regulation. It classifies AI systems by risk level and applies proportionate obligations.',
    terms: [
      { en: 'high-risk AI system', zh: '高风险人工智能系统', pos: 'n.', isLegal: true, domain: '人工智能', context: 'Providers of high-risk AI systems will face conformity assessments.', verified: false },
      { en: 'conformity assessment', zh: '符合性评估', pos: 'n.', isLegal: true, domain: '人工智能', context: '...face conformity assessments before placing systems on the market.', verified: false },
      { en: 'human oversight', zh: '人工监督', pos: 'n.', isLegal: true, domain: '人工智能', context: '...transparency obligations, and human oversight requirements.', verified: true },
      { en: 'phase in', zh: '分阶段实施', pos: 'v.', isLegal: false, domain: '人工智能', context: 'phasing in obligations for high-risk AI systems.', verified: true },
    ],
  },
  {
    id: 'art_2', sourceId: 'src_scotus',
    title: 'Supreme Court weighs First Amendment limits on state social media laws',
    summary: 'The U.S. Supreme Court heard arguments in cases challenging Texas and Florida laws that restrict social media platforms from moderating user content. The core issue is whether the First Amendment protects platforms\' editorial judgment or whether states can mandate viewpoint-neutral hosting.',
    url: 'https://www.supremecourt.gov/opinions/social-media',
    publishedAt: d(1), eventAt: d(2), fetchedAt: d(1), lang: 'en',
    domains: ['宪法行政法', '数据与隐私'],
    parties: ['U.S. Supreme Court', 'State of Texas', 'State of Florida', 'NetChoice'],
    background: 'Two state laws sought to limit platforms\' ability to remove or deplatform users. Industry groups argue moderation is protected editorial activity.',
    terms: [
      { en: 'First Amendment', zh: '第一修正案', pos: 'n.', isLegal: true, domain: '宪法行政法', context: 'The core issue is whether the First Amendment protects platforms.', verified: true },
      { en: 'editorial judgment', zh: '编辑裁量', pos: 'n.', isLegal: true, domain: '宪法行政法', context: '...protects platforms\' editorial judgment.', verified: false },
      { en: 'viewpoint-neutral', zh: '观点中立', pos: 'adj.', isLegal: true, domain: '宪法行政法', context: '...mandate viewpoint-neutral hosting.', verified: false },
      { en: 'deplatform', zh: '封禁账号 / 下架平台', pos: 'v.', isLegal: false, domain: '数据与隐私', context: '...limit platforms\' ability to remove or deplatform users.', verified: true },
    ],
  },
  {
    id: 'art_3', sourceId: 'src_ft',
    title: 'Generative AI copyright disputes test fair use boundaries in US courts',
    summary: 'A series of lawsuits against major generative AI companies have forced U.S. courts to revisit the fair use doctrine. Judges are weighing whether training large language models on copyrighted works constitutes transformative use or simply market substitution.',
    url: 'https://www.ft.com/ai-copyright-fair-use',
    publishedAt: d(1), eventAt: d(3), fetchedAt: d(1), lang: 'en',
    domains: ['知识产权', '人工智能'],
    parties: ['Getty Images', 'Stability AI', 'OpenAI', 'Authors Guild'],
    background: 'Fair use is a U.S. doctrine allowing limited use of copyrighted material without permission. Its application to AI training is unsettled.',
    terms: [
      { en: 'fair use', zh: '合理使用', pos: 'n.', isLegal: true, domain: '知识产权', context: '...forced U.S. courts to revisit the fair use doctrine.', verified: true },
      { en: 'transformative use', zh: '转换性使用', pos: 'n.', isLegal: true, domain: '知识产权', context: '...constitutes transformative use or market substitution.', verified: true },
      { en: 'market substitution', zh: '市场替代', pos: 'n.', isLegal: true, domain: '知识产权', context: '...simply market substitution.', verified: false },
      { en: 'training data', zh: '训练数据', pos: 'n.', isLegal: false, domain: '人工智能', context: 'training large language models on copyrighted works.', verified: true },
    ],
  },
  {
    id: 'art_4', sourceId: 'src_edpb',
    title: 'EDPB issues guidance on cross-border data transfers under GDPR after Schrems II',
    summary: 'The European Data Protection Board published updated guidance on Standard Contractual Clauses and supplementary measures for transfers of personal data outside the EEA. The guidance emphasizes case-by-case assessment of the legal regime in the destination country.',
    url: 'https://www.edpb.europa.eu/guidance-transfers',
    publishedAt: d(2), eventAt: d(2), fetchedAt: d(2), lang: 'en',
    domains: ['数据与隐私', '国际贸易'],
    parties: ['European Data Protection Board'],
    background: 'Following the Schrems II ruling, transfers outside the EEA require assessment of the destination country\'s surveillance laws and appropriate safeguards.',
    terms: [
      { en: 'cross-border data transfer', zh: '跨境数据传输', pos: 'n.', isLegal: true, domain: '数据与隐私', context: '...guidance on cross-border data transfers under GDPR.', verified: true },
      { en: 'Standard Contractual Clauses', zh: '标准合同条款', pos: 'n.', isLegal: true, domain: '数据与隐私', context: '...Standard Contractual Clauses and supplementary measures.', verified: true },
      { en: 'supplementary measures', zh: '补充措施', pos: 'n.', isLegal: true, domain: '数据与隐私', context: '...supplementary measures for transfers outside the EEA.', verified: false },
      { en: 'case-by-case assessment', zh: '个案评估', pos: 'n.', isLegal: true, domain: '数据与隐私', context: '...case-by-case assessment of the legal regime.', verified: true },
    ],
  },
  {
    id: 'art_5', sourceId: 'src_wipo',
    title: 'WIPO members advance negotiations on a treaty for AI and intellectual property',
    summary: 'Member states at the World Intellectual Property Organization have moved closer to a framework addressing generative AI\'s impact on copyright and patents. Key sticking points include disclosure obligations for AI-generated content and liability for training on protected works.',
    url: 'https://www.wipo.int/ai-treaty-negotiations',
    publishedAt: d(3), eventAt: d(4), fetchedAt: d(3), lang: 'en',
    domains: ['知识产权', '人工智能', '国际贸易'],
    parties: ['WIPO', 'Member States'],
    background: 'WIPO has been deliberating AI\'s implications for IP since 2019. A binding treaty remains years away.',
    terms: [
      { en: 'disclosure obligation', zh: '披露义务', pos: 'n.', isLegal: true, domain: '知识产权', context: '...disclosure obligations for AI-generated content.', verified: false },
      { en: 'liability', zh: '法律责任', pos: 'n.', isLegal: true, domain: '知识产权', context: '...liability for training on protected works.', verified: true },
      { en: 'binding treaty', zh: '具有约束力的条约', pos: 'n.', isLegal: true, domain: '国际贸易', context: 'A binding treaty remains years away.', verified: true },
      { en: 'sticking point', zh: '症结 / 争议焦点', pos: 'n.', isLegal: false, domain: '人工智能', context: 'Key sticking points include disclosure obligations.', verified: true },
    ],
  },
  {
    id: 'art_6', sourceId: 'src_court_gov',
    title: '最高法发布反垄断典型案例，涉平台经济「二选一」行为',
    summary: '最高人民法院发布一批反垄断典型案例，其中涉及互联网平台要求商家「二选一」的行为被认定构成滥用市场支配地位。法院明确了相关市场界定与市场支配地位的认定思路。',
    url: 'https://www.court.gov.cn/antitrust-cases',
    publishedAt: d(2), eventAt: d(5), fetchedAt: d(2), lang: 'zh',
    domains: ['反垄断', '公司法'],
    parties: ['最高人民法院', '互联网平台企业'],
    background: '中国《反垄断法》于 2022 年修订，强化了对平台经济领域垄断行为的规制。',
    terms: [
      { en: 'abuse of dominant market position', zh: '滥用市场支配地位', pos: 'n.', isLegal: true, domain: '反垄断', context: '「二选一」行为被认定构成滥用市场支配地位。', verified: true },
      { en: 'relevant market', zh: '相关市场', pos: 'n.', isLegal: true, domain: '反垄断', context: '明确了相关市场界定的思路。', verified: true },
      { en: 'market definition', zh: '市场界定', pos: 'n.', isLegal: true, domain: '反垄断', context: '相关市场界定与市场支配地位的认定。', verified: false },
      { en: 'exclusive dealing', zh: '排他性交易', pos: 'n.', isLegal: true, domain: '反垄断', context: '要求商家「二选一」属于排他性交易安排。', verified: false },
    ],
  },
  {
    id: 'art_7', sourceId: 'src_reuters',
    title: 'Major tech firms face antitrust scrutiny over app store payment restrictions',
    summary: 'Regulators in multiple jurisdictions are examining whether app store policies that force developers to use the platform\'s own payment system violate competition law. The cases follow the EU\'s Digital Markets Act designation of several platforms as gatekeepers.',
    url: 'https://www.reuters.com/legal/app-store-antitrust',
    publishedAt: d(3), eventAt: d(4), fetchedAt: d(3), lang: 'en',
    domains: ['反垄断', '公司法'],
    parties: ['Apple', 'Google', 'European Commission'],
    background: 'The EU DMA imposes special obligations on large platforms designated as gatekeepers, including allowing alternative payment systems.',
    terms: [
      { en: 'competition law', zh: '竞争法', pos: 'n.', isLegal: true, domain: '反垄断', context: '...violate competition law.', verified: true },
      { en: 'gatekeeper', zh: '守门人', pos: 'n.', isLegal: true, domain: '反垄断', context: '...designation of several platforms as gatekeepers.', verified: true },
      { en: 'Digital Markets Act', zh: '《数字市场法》', pos: 'n.', isLegal: true, domain: '反垄断', context: '...follow the EU\'s Digital Markets Act designation.', verified: true },
      { en: 'app store', zh: '应用商店', pos: 'n.', isLegal: false, domain: '公司法', context: 'app store policies that force developers...', verified: true },
    ],
  },
  {
    id: 'art_8', sourceId: 'src_echr',
    title: 'ECHR ruling clarifies right to be forgotten in cross-border defamation cases',
    summary: 'The European Court of Human Rights ruled on the extent to which individuals can request the removal of old, lawfully published news articles in cross-border defamation contexts. The judgment balances the right to privacy under Article 8 against press freedom under Article 10.',
    url: 'https://hudoc.echr.coe.int/right-to-be-forgotten',
    publishedAt: d(4), eventAt: d(6), fetchedAt: d(4), lang: 'en',
    domains: ['数据与隐私', '宪法行政法', '国际仲裁'],
    parties: ['European Court of Human Rights'],
    background: 'The right to be forgotten, rooted in GDPR and ECHR jurisprudence, allows individuals to request delisting of outdated or inaccurate personal data.',
    terms: [
      { en: 'right to be forgotten', zh: '被遗忘权', pos: 'n.', isLegal: true, domain: '数据与隐私', context: '...ruling clarifies right to be forgotten.', verified: true },
      { en: 'defamation', zh: '诽谤', pos: 'n.', isLegal: true, domain: '宪法行政法', context: '...in cross-border defamation cases.', verified: true },
      { en: 'Article 8 / Article 10', zh: '《欧洲人权公约》第 8 条 / 第 10 条', pos: 'n.', isLegal: true, domain: '宪法行政法', context: '...balances the right to privacy under Article 8 against press freedom under Article 10.', verified: true },
      { en: 'delisting', zh: '下架 / 去索引', pos: 'n.', isLegal: true, domain: '数据与隐私', context: '...request delisting of outdated personal data.', verified: false },
    ],
  },
  {
    id: 'art_9', sourceId: 'src_ft',
    title: 'Global minimum tax rules take effect, reshaping corporate tax planning',
    summary: 'The OECD/G20 Inclusive Framework\'s global minimum tax of 15% has begun taking effect across key jurisdictions. Multinational enterprises must now reassess cross-border structures as top-up taxes apply in low-tax jurisdictions.',
    url: 'https://www.ft.com/global-minimum-tax',
    publishedAt: d(4), eventAt: d(5), fetchedAt: d(4), lang: 'en',
    domains: ['公司法', '金融监管', '国际贸易'],
    parties: ['OECD', 'G20', 'Multinational enterprises'],
    background: 'Pillar Two of the OECD framework aims to ensure large multinationals pay a minimum effective tax rate of 15%.',
    terms: [
      { en: 'global minimum tax', zh: '全球最低税', pos: 'n.', isLegal: true, domain: '公司法', context: '...global minimum tax of 15% has begun taking effect.', verified: true },
      { en: 'top-up tax', zh: '补足税', pos: 'n.', isLegal: true, domain: '公司法', context: '...top-up taxes apply in low-tax jurisdictions.', verified: true },
      { en: 'tax planning', zh: '税务筹划', pos: 'n.', isLegal: true, domain: '公司法', context: 'reshaping corporate tax planning.', verified: true },
      { en: 'Inclusive Framework', zh: '包容性框架', pos: 'n.', isLegal: true, domain: '国际贸易', context: 'The OECD/G20 Inclusive Framework\'s global minimum tax.', verified: false },
    ],
  },
  {
    id: 'art_10', sourceId: 'src_court_gov',
    title: '劳动争议典型案例：算法管理下的劳动关系认定',
    summary: '多地法院发布劳动争议典型案例，涉及平台用工中算法管理对劳动关系认定的影响。法院在个案中考察从属性标准，包括人身从属性、经济从属性和组织从属性。',
    url: 'https://www.court.gov.cn/labor-algorithm',
    publishedAt: d(5), eventAt: d(7), fetchedAt: d(5), lang: 'zh',
    domains: ['劳动法', '人工智能'],
    parties: ['人民法院', '平台企业', '劳动者'],
    background: '平台经济下用工形态灵活，劳动关系认定涉及多重从属性标准的综合判断。',
    terms: [
      { en: 'employment relationship', zh: '劳动关系', pos: 'n.', isLegal: true, domain: '劳动法', context: '算法管理对劳动关系认定的影响。', verified: true },
      { en: 'subordination', zh: '从属性', pos: 'n.', isLegal: true, domain: '劳动法', context: '考察从属性标准，包括人身从属性、经济从属性。', verified: true },
      { en: 'algorithm management', zh: '算法管理', pos: 'n.', isLegal: false, domain: '人工智能', context: '平台用工中算法管理对认定的影响。', verified: true },
      { en: 'platform work', zh: '平台用工', pos: 'n.', isLegal: false, domain: '劳动法', context: '平台经济下用工形态灵活。', verified: true },
    ],
  },
  {
    id: 'art_11', sourceId: 'src_reuters',
    title: 'Crypto exchange faces SEC enforcement action over unregistered securities offering',
    summary: 'The U.S. Securities and Exchange Commission charged a major cryptocurrency exchange with offering unregistered securities through its staking program. The case further tests the Howey Test in the context of digital assets.',
    url: 'https://www.reuters.com/legal/crypto-sec-enforcement',
    publishedAt: d(5), eventAt: d(8), fetchedAt: d(5), lang: 'en',
    domains: ['金融监管', '刑事司法'],
    parties: ['SEC', 'Cryptocurrency exchange'],
    background: 'The SEC has taken the position that many crypto tokens and services qualify as securities under U.S. law.',
    terms: [
      { en: 'unregistered securities', zh: '未注册证券', pos: 'n.', isLegal: true, domain: '金融监管', context: '...offering unregistered securities.', verified: true },
      { en: 'Howey Test', zh: '豪威测试', pos: 'n.', isLegal: true, domain: '金融监管', context: '...further tests the Howey Test.', verified: true },
      { en: 'staking', zh: '质押（加密货币）', pos: 'n.', isLegal: false, domain: '金融监管', context: '...through its staking program.', verified: true },
      { en: 'enforcement action', zh: '执法行动', pos: 'n.', isLegal: true, domain: '金融监管', context: '...faces SEC enforcement action.', verified: true },
    ],
  },
  {
    id: 'art_12', sourceId: 'src_scotus',
    title: 'Supreme Court limits EPA authority under major questions doctrine',
    summary: 'In a significant administrative law ruling, the Supreme Court invoked the major questions doctrine to restrict the Environmental Protection Agency\'s authority to regulate power plant emissions without explicit congressional authorization.',
    url: 'https://www.supremecourt.gov/epa-major-questions',
    publishedAt: d(6), eventAt: d(9), fetchedAt: d(6), lang: 'en',
    domains: ['环境法', '宪法行政法'],
    parties: ['U.S. Supreme Court', 'EPA'],
    background: 'The major questions doctrine requires agencies to point to clear congressional authorization when asserting transformative authority.',
    terms: [
      { en: 'major questions doctrine', zh: '重大问题原则', pos: 'n.', isLegal: true, domain: '宪法行政法', context: '...invoked the major questions doctrine.', verified: true },
      { en: 'administrative law', zh: '行政法', pos: 'n.', isLegal: true, domain: '宪法行政法', context: 'a significant administrative law ruling.', verified: true },
      { en: 'congressional authorization', zh: '国会授权', pos: 'n.', isLegal: true, domain: '宪法行政法', context: '...without explicit congressional authorization.', verified: true },
      { en: 'emissions', zh: '排放', pos: 'n.', isLegal: false, domain: '环境法', context: '...regulate power plant emissions.', verified: true },
    ],
  },
];

// 构造初始选题（每条文章对应一条选题）
export function buildDemoTopics() {
  return demoArticles.map(a => ({
    id: uid('topic'),
    articleIds: [a.id],
    status: 'pending',
    totalScore: 0,      // 由评分引擎填充
    scoreBreakdown: {},  // 由评分引擎填充
    reason: '',          // 由评分引擎填充
    domains: a.domains.slice(),
    tags: [],
    notes: '',
    plannedDate: null,
    priorityOverride: null,
    verificationQuestions: buildVerificationQuestions(a),
    createdAt: a.fetchedAt,
    updatedAt: a.fetchedAt,
  }));
}

function buildVerificationQuestions(article) {
  const base = [
    '原文链接是否可访问？法律事实是否与摘要一致？',
    '关键法律术语的中文释义是否准确？是否需要查权威词典？',
    '是否有原始判决/法规/官方公告可作为法律依据？',
  ];
  if (article.lang === 'zh') {
    base.push('中文报道中涉及的英文术语是否已对应到正确的英文原文？');
  } else {
    base.push('英文原文中的法律术语是否有对应的中文通译？');
  }
  if (article.domains.includes('人工智能')) {
    base.push('AI 相关表述是否区分了「通用 AI」与「高风险 AI」等法律概念？');
  }
  return base;
}
