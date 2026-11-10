// ===== 推荐评分引擎（可解释、权重可调）=====
import { SCORE_DIMS } from '../constants.js';
import { daysAgo, clamp, round } from '../utils.js';

// 基于文章内容的可解释评分。所有评分都带理由。
export function scoreTopic(topic, state) {
  const article = state.articles.find(a => a.id === topic.articleIds?.[0]);
  if (!article) {
    return { total: 0, breakdown: {}, reason: '未关联文章' };
  }
  const source = state.sources.find(s => s.id === article.sourceId);
  const weights = state.settings?.weights || {};
  const focusDomains = state.settings?.focusDomains || [];
  const keywords = (state.settings?.keywords || []).map(k => k.toLowerCase());

  const text = (article.title + ' ' + article.summary + ' ' + (article.background || '')).toLowerCase();

  // 1. 法律相关度：领域命中 + 关键词命中 + 是否含法律术语
  const domainHit = article.domains?.some(d => focusDomains.includes(d)) ? 1 : 0.5;
  const kwHits = keywords.filter(k => text.includes(k)).length;
  const legalRelevance = clamp(40 + domainHit * 25 + Math.min(kwHits, 5) * 7 + (article.terms?.filter(t => t.isLegal).length > 2 ? 10 : 0), 0, 100);

  // 2. 英语学习价值：英文术语数 + 双语价值 + 是否英文原文
  const enTerms = article.terms?.length || 0;
  const englishValue = clamp(30 + Math.min(enTerms, 6) * 12 + (article.lang === 'en' ? 15 : article.lang === 'zh-en' ? 8 : 0), 0, 100);

  // 3. 时效性：发布时间越近越高
  const age = daysAgo(article.publishedAt);
  const timeliness = clamp(100 - age * 12, 10, 100);

  // 4. 目标读者兴趣：是否在重点领域 + 是否热点主题
  const focusDomainCount = article.domains?.filter(d => focusDomains.includes(d)).length || 0;
  const readerInterest = clamp(35 + focusDomainCount * 22 + (enTerms >= 3 ? 10 : 0), 0, 100);

  // 5. 内容可写性：摘要长度 + 多领域 + 术语丰富度
  const hasBackground = article.background ? 12 : 0;
  const multiDomain = (article.domains?.length || 0) >= 2 ? 12 : 0;
  const writeability = clamp(40 + Math.min(enTerms, 4) * 10 + hasBackground + multiDomain, 0, 100);

  // 6. 来源可信度：官方/权威媒体 > RSS > 其他
  let cred = 50;
  if (source) {
    if (source.type === 'official') cred = 95;
    else if (source.category === '权威媒体' || source.category === '财经媒体') cred = 88;
    else if (source.type === 'rss') cred = 75;
    else if (source.category === '法院官网') cred = 92;
    else cred = 65;
  }
  const sourceCredibility = cred;

  const breakdown = {
    legalRelevance: round(legalRelevance),
    englishValue: round(englishValue),
    timeliness: round(timeliness),
    readerInterest: round(readerInterest),
    writeability: round(writeability),
    sourceCredibility: round(sourceCredibility),
  };

  // 加权总分
  let total = 0, weightSum = 0;
  SCORE_DIMS.forEach(dim => {
    const w = weights[dim.key] ?? 1;
    total += breakdown[dim.key] * w;
    weightSum += w;
  });
  total = round(total / Math.max(weightSum, 0.0001));

  // 用户手动覆盖优先级
  if (topic.priorityOverride != null) {
    total = clamp(topic.priorityOverride);
  }

  const reason = buildReason(breakdown, article, source, focusDomains, keywords);

  return { total, breakdown, reason };
}

function buildReason(b, article, source, focusDomains, keywords) {
  const parts = [];
  if (article.domains?.some(d => focusDomains.includes(d))) {
    parts.push(`命中重点领域「${article.domains.filter(d => focusDomains.includes(d)).join('、')}」`);
  }
  if (b.legalRelevance >= 70) parts.push('法律相关度高');
  if (b.englishValue >= 70) parts.push(`含 ${article.terms?.length || 0} 个可讲解术语，英语学习价值高`);
  if (b.timeliness >= 80) parts.push('时效性强（近期发布）');
  if (b.sourceCredibility >= 85) parts.push(`来源可信（${source?.name || '权威来源'}）`);
  if (b.writeability >= 70) parts.push('内容信息密度高，适合展开');
  if (parts.length === 0) parts.push('综合各维度评分，可作为备选选题');
  return parts.join('；') + '。';
}
