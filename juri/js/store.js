// ===== 状态管理 + localStorage 持久化 =====
import { demoSources, demoArticles, buildDemoTopics } from './data/demoData.js';
import { scoreTopic } from './services/scorer.js';
import { uid } from './utils.js';

const STORAGE_KEY = 'juri_topics_desk_v1';
const SCHEMA_VERSION = 2; // 升级：sources 换成 BBC/CNN/Reuters 等真实 RSS

const defaultState = () => ({
  schemaVersion: SCHEMA_VERSION,
  dataMode: 'demo', // 'demo' | 'real'
  sources: [],
  articles: [],
  topics: [],
  terms: [],
  drafts: [],
  feedback: [],
  settings: {
    focusDomains: ['人工智能', '数据与隐私', '知识产权'],
    keywords: ['AI', 'GDPR', 'copyright', '反垄断', 'privacy'],
    platforms: ['xiaohongshu', 'wechat'],
    weights: {
      legalRelevance: 1.2, englishValue: 1.0, timeliness: 0.8,
      readerInterest: 0.9, writeability: 0.7, sourceCredibility: 1.0,
    },
    sourcePreferences: {}, // sourceId -> weight multiplier
    fetchFrequency: 'daily',
    audience: '法律英语学习者 / 法学生 / 涉外律师',
  },
  lastFetchedAt: null,
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch (e) {
    console.warn('load state failed', e);
    return null;
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('persist failed', e);
  }
}

class Store {
  constructor() {
    const saved = load();
    if (saved) {
      this.state = saved;
    } else {
      this.state = defaultState();
      this.seedDemo();
    }
    this.listeners = new Set();
  }

  getState() { return this.state; }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    persist(this.state);
    this.listeners.forEach(fn => fn(this.state));
  }

  setState(updater) {
    this.state = updater(this.state);
    this.notify();
  }

  // ===== 初始化演示数据 =====
  seedDemo() {
    const sources = demoSources.map(s => ({ ...s }));
    const articles = demoArticles.map(a => {
      const { terms, ...rest } = a;
      return { ...rest, dedupKey: this.makeDedupKey(a.title) };
    });
    const topics = buildDemoTopics();
    const terms = [];
    demoArticles.forEach(a => {
      a.terms.forEach(t => terms.push({
        id: uid('term'),
        articleId: a.id,
        ...t,
        verified: !!t.verified,
        note: '',
      }));
    });

    this.state.sources = sources;
    this.state.articles = articles;
    this.state.terms = terms;

    // 评分 & 生成理由
    topics.forEach(t => {
      const res = scoreTopic(t, this.state);
      t.totalScore = res.total;
      t.scoreBreakdown = res.breakdown;
      t.reason = res.reason;
    });
    this.state.topics = topics;

    // 随机设置几条已有状态，让看板不空
    const setStatus = (idx, status) => { if (topics[idx]) topics[idx].status = status; };
    setStatus(0, 'saved');
    setStatus(2, 'verifying');
    setStatus(3, 'writing');
    setStatus(5, 'saved');
    setStatus(7, 'published');
    setStatus(9, 'ignored');
    setStatus(11, 'verifying');

    // 为已发布的 7 号生成草稿与反馈
    const pub = topics[7];
    if (pub) {
      const draft = {
        id: uid('draft'), topicId: pub.id, platform: 'wechat',
        title: '「被遗忘权」到底是什么？一文读懂跨境诽谤中的隐私边界',
        angle: '从 ECHR 最新判决切入，讲解 right to be forgotten 在跨境场景中的适用边界，兼顾法律概念与英语表达。',
        outline: '1. 案件背景：ECHR 最新判决\n2. 核心概念：right to be forgotten vs. delisting\n3. 法律平衡：Article 8 (隐私) vs. Article 10 (言论自由)\n4. 跨境场景下的难点\n5. 对内容创作者的启示\n6. 关键术语总结',
        learningPoints: ['right to be forgotten 被遗忘权', 'defamation 诽谤', 'Article 8 / Article 10'],
        createdAt: new Date().toISOString(),
      };
      this.state.drafts.push(draft);
      this.state.feedback.push({
        id: uid('fb'), topicId: pub.id, type: 'adopt', platform: 'wechat',
        publishedUrl: 'https://mp.weixin.qq.com/s/demo', publishedAt: d(0),
        metrics: { views: 3200, likes: 128, comments: 36, collects: 210 }, rating: 4,
        note: '读者反馈术语解释清晰，建议下期补充案例原文链接。',
        createdAt: new Date().toISOString(),
      });
    }

    this.state.lastFetchedAt = new Date().toISOString();
    persist(this.state);
  }

  makeDedupKey(title) {
    return (title || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '').slice(0, 60);
  }

  // ===== 来源 =====
  addSource(src) {
    this.setState(s => ({
      ...s,
      sources: [...s.sources, { ...src, id: uid('src'), lastFetchedAt: null }],
    }));
  }
  updateSource(id, patch) {
    this.setState(s => ({
      ...s,
      sources: s.sources.map(x => x.id === id ? { ...x, ...patch } : x),
    }));
  }
  deleteSource(id) {
    this.setState(s => ({ ...s, sources: s.sources.filter(x => x.id !== id) }));
  }

  // ===== 选题 =====
  updateTopic(id, patch) {
    this.setState(s => {
      const topics = s.topics.map(t => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch, updatedAt: new Date().toISOString() };
        // 若评分相关字段变化，重新评分
        if (patch.domains || patch.priorityOverride != null) {
          const res = scoreTopic(next, s);
          next.totalScore = res.total;
          next.scoreBreakdown = res.breakdown;
          next.reason = res.reason;
        }
        return next;
      });
      return { ...s, topics };
    });
  }
  setTopicStatus(id, status) {
    this.updateTopic(id, { status });
    // 记录反馈
    if (status === 'ignored') {
      this.addFeedback({ topicId: id, type: 'ignore' });
    } else if (status === 'saved') {
      this.addFeedback({ topicId: id, type: 'adopt' });
    }
  }

  addTopic(articleIds, overrides = {}) {
    const t = {
      id: uid('topic'), articleIds, status: 'pending',
      totalScore: 0, scoreBreakdown: {}, reason: '',
      domains: [], tags: [], notes: '', plannedDate: null, priorityOverride: null,
      verificationQuestions: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      ...overrides,
    };
    const res = scoreTopic(t, this.state);
    t.totalScore = res.total; t.scoreBreakdown = res.breakdown; t.reason = res.reason;
    this.setState(s => ({ ...s, topics: [t, ...s.topics] }));
    return t;
  }

  mergeArticlesToTopic(topicId, articleIds) {
    this.setState(s => ({
      ...s,
      topics: s.topics.map(t => t.id === topicId
        ? { ...t, articleIds: [...new Set([...t.articleIds, ...articleIds])], updatedAt: new Date().toISOString() }
        : t),
    }));
  }

  // ===== 术语 =====
  updateTerm(id, patch) {
    this.setState(s => ({
      ...s,
      terms: s.terms.map(t => t.id === id ? { ...t, ...patch } : t),
    }));
  }
  addTerm(term) {
    this.setState(s => ({ ...s, terms: [...s.terms, { ...term, id: uid('term') }] }));
  }
  deleteTerm(id) {
    this.setState(s => ({ ...s, terms: s.terms.filter(t => t.id !== id) }));
  }

  // ===== 草稿 =====
  saveDraft(draft) {
    this.setState(s => {
      const exists = s.drafts.find(d => d.id === draft.id);
      if (exists) {
        return { ...s, drafts: s.drafts.map(d => d.id === draft.id ? { ...d, ...draft } : d) };
      }
      return { ...s, drafts: [...s.drafts, { ...draft, id: draft.id || uid('draft'), createdAt: draft.createdAt || new Date().toISOString() }] };
    });
  }
  deleteDraft(id) {
    this.setState(s => ({ ...s, drafts: s.drafts.filter(d => d.id !== id) }));
  }

  // ===== 反馈 =====
  addFeedback(fb) {
    this.setState(s => ({ ...s, feedback: [...s.feedback, { ...fb, id: uid('fb'), createdAt: new Date().toISOString() }] }));
  }

  // ===== 设置 =====
  updateSettings(patch) {
    this.setState(s => {
      const settings = { ...s.settings, ...patch };
      // 权重变化后重算所有选题评分
      const topics = s.topics.map(t => {
        const res = scoreTopic({ ...t }, { ...s, settings });
        return { ...t, totalScore: res.total, scoreBreakdown: res.breakdown, reason: res.reason };
      });
      return { ...s, settings, topics };
    });
  }

  // ===== 重新采集（演示：重置评分并模拟新增） =====
  refetch() {
    this.setState(s => {
      const topics = s.topics.map(t => {
        const res = scoreTopic(t, s);
        return { ...t, totalScore: res.total, scoreBreakdown: res.breakdown, reason: res.reason, updatedAt: new Date().toISOString() };
      });
      return { ...s, topics, lastFetchedAt: new Date().toISOString() };
    });
  }

  // ===== 批量入库真实采集的文章 =====
  // 输入 articles（来自 RSS fetcher 的 Article 数组）
  // 输出 { addedArticles, addedTopics, skipped }
  ingestArticles(incomingArticles) {
    if (!incomingArticles || incomingArticles.length === 0) return { addedArticles: 0, addedTopics: 0, skipped: 0 };

    let addedArticles = 0, addedTopics = 0, skipped = 0;

    this.setState(s => {
      const existingKeys = new Set(s.articles.map(a => a.dedupKey));
      const existingUrls = new Set(s.articles.map(a => a.url));

      const newArticles = [];
      const newTopics = [];

      for (const raw of incomingArticles) {
        // 去重：标题 dedupKey 或 url 命中都跳过
        if (raw.dedupKey && existingKeys.has(raw.dedupKey)) { skipped++; continue; }
        if (raw.url && existingUrls.has(raw.url)) { skipped++; continue; }

        const article = { ...raw, fetchedAt: raw.fetchedAt || new Date().toISOString() };
        const id = article.id || uid('art');
        article.id = id;
        article.dedupKey = article.dedupKey || (article.title || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '').slice(0, 60);
        newArticles.push(article);
        existingKeys.add(article.dedupKey);
        existingUrls.add(article.url);
        addedArticles++;

        // 自动生成选题
        const topic = {
          id: uid('topic'),
          articleIds: [id],
          status: 'pending',
          totalScore: 0, scoreBreakdown: {}, reason: '',
          domains: article.domains || [],
          tags: [], notes: '', plannedDate: null, priorityOverride: null,
          verificationQuestions: [
            '原文链接是否可访问？法律事实是否与摘要一致？',
            '关键法律术语的中文释义是否准确？是否需要查权威词典？',
            '是否有原始判决/法规/官方公告可作为法律依据？',
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const res = scoreTopic(topic, { ...s, articles: [...s.articles, article] });
        topic.totalScore = res.total; topic.scoreBreakdown = res.breakdown; topic.reason = res.reason;
        newTopics.push(topic);
        addedTopics++;
      }

      const dataMode = 'real'; // 只要有真实文章入库，就切换徽标
      return {
        ...s, dataMode,
        articles: [...s.articles, ...newArticles],
        topics: [...s.topics, ...newTopics],
        lastFetchedAt: new Date().toISOString(),
      };
    });

    return { addedArticles, addedTopics, skipped };
  }

  // ===== 重置全部数据 =====
  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = defaultState();
    this.seedDemo();
    this.notify();
  }
}

function d(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt.toISOString();
}

export const store = new Store();
