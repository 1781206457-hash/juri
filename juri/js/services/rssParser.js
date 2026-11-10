// ===== RSS 解析器（纯浏览器端，零依赖）=====
// 解析标准 RSS 2.0 XML → [{ title, summary, url, publishedAt, ... }]
// 处理 CDATA 包装、<content:encoded> 扩展等常见情况。

import { uid } from '../utils.js';

// 从文档中取出第一个指定 tag 的文本，处理 CDATA 与 content:encoded 回退
function tagText(parent, names) {
  for (const name of names) {
    const list = parent.getElementsByTagName(name);
    if (list.length) {
      const raw = list[0].textContent || '';
      if (raw.trim()) return cleanText(raw);
    }
  }
  return '';
}

function cleanText(s) {
  return (s || '').trim().replace(/<!\[CDATA\[|\]\]>/g, '').replace(/\s+/g, ' ').trim();
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function stripHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.innerHTML = s.replace(/<!\[CDATA\[|\]\]>/g, '');
  // 移除所有 tag 只保留文本
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

// 构造摘要：优先 description（去 HTML），太短再用 content:encoded
function buildSummary(item) {
  const descRaw = tagText(item, ['description']);
  const contentRaw = tagText(item, ['content:encoded', 'content']);
  let s = stripHtml(descRaw);
  if (s.length < 40 && contentRaw) {
    s = stripHtml(contentRaw);
  }
  // 截断到 300 字
  if (s.length > 300) s = s.slice(0, 300) + '…';
  return s;
}

function detectEnclosure(item) {
  const enc = item.getElementsByTagName('enclosure');
  if (enc.length) return enc[0].getAttribute('url') || '';
  return '';
}

function detectCategory(item) {
  const cats = item.getElementsByTagName('category');
  return Array.from(cats).map(c => stripHtml(c.textContent)).filter(Boolean).slice(0, 3);
}

export function parseRSS(xmlText, sourceId, sourceLang = 'en') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  // XML 解析错误？
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) {
    throw new Error('RSS XML 解析失败：' + stripHtml(parseErr.textContent));
  }

  const items = Array.from(doc.getElementsByTagName('item'));
  const articles = items.map((item, i) => {
    const title = cleanText(tagText(item, ['title']));
    const link = cleanText(tagText(item, ['link'])) || '';
    const summary = buildSummary(item);
    const guid = cleanText(tagText(item, ['guid'])) || link || uid('guid');
    const publishedAt = parseDate(tagText(item, ['pubDate', 'dc:date', 'date']));
    const eventAt = publishedAt;
    const categories = detectCategory(item);

    return {
      id: uid('art'),
      sourceId,
      title,
      summary,
      url: link,
      guid,
      publishedAt,
      eventAt,
      fetchedAt: new Date().toISOString(),
      lang: sourceLang,
      domains: guessDomains(title + ' ' + summary + ' ' + categories.join(' ')),
      parties: [],
      background: '',
      terms: [],
      dedupKey: title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '').slice(0, 60),
    };
  });

  return articles;
}

// 简易法律领域猜测（基于关键词）
const DOMAIN_KEYWORDS = {
  '人工智能': ['ai ', 'artificial intelligence', 'generative ai', 'llm', 'gpt', 'machine learning', '算法', '人工智能'],
  '数据与隐私': ['privacy', 'gdpr', 'data protection', 'personal data', '个人信息', '隐私'],
  '知识产权': ['copyright', 'patent', 'trademark', 'ip ', 'intellectual property', '著作权', '专利', '商标', '知识产权'],
  '反垄断': ['antitrust', 'competition law', 'market dominance', 'gatekeeper', '反垄断', '竞争法'],
  '劳动法': ['employment', 'labor', 'worker', 'union', 'employment law', '劳动法', '劳动合同'],
  '公司法': ['corporate', 'company law', 'm&a', 'merger', 'acquisition', '公司法'],
  '金融监管': ['sec', 'fintech', 'crypto', 'banking', 'regulation', '金融监管', '证券'],
  '国际贸易': ['trade', 'wto', 'tariff', 'export control', '国际贸易'],
  '刑事司法': ['criminal', 'prosecution', 'indictment', 'conviction', 'sentence', '刑事', '起诉'],
  '环境法': ['environmental', 'climate', 'epa', 'emission', '碳排放', '环境法'],
  '宪法行政法': ['supreme court', 'constitution', 'first amendment', 'administrative law', '最高法院', '宪法'],
  '国际仲裁': ['arbitration', 'international law', 'treaty', 'convention', '国际仲裁', '条约'],
};

function guessDomains(text) {
  const lower = text.toLowerCase();
  const hits = [];
  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    if (kws.some(k => lower.includes(k.toLowerCase()))) {
      hits.push(domain);
    }
  }
  // 默认给一个通用领域
  if (hits.length === 0) hits.push('刑事司法');
  return hits.slice(0, 3);
}
