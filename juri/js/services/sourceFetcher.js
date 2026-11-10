// ===== 新闻来源采集接口（可替换模块）=====
// 真实接入：rss / official 类型，按以下优先级尝试拉取：
//   1) 同路径代理 /proxy（Vercel Function，线上生产环境）
//   2) 本地代理 http://localhost:8766/proxy（python3 api/proxy.py，本地开发）
//   3) 浏览器直连（CORS 允许时最快）
//   4) 公共 CORS 代理链（allorigins → corsproxy → codetabs）
//   5) 全部失败则报错
// 不绕过登录/付费墙，密钥不放前端。

import { demoArticles } from '../data/demoData.js';
import { parseRSS } from './rssParser.js';

// 代理候选（按优先级尝试，第一个成功就停）
const PROXY_CANDIDATES = [
  (url) => `/proxy?url=${encodeURIComponent(url)}`,                              // 线上 Vercel
  (url) => `http://localhost:8766/proxy?url=${encodeURIComponent(url)}`,        // 本地开发
];

// 公共 CORS 代理链：最后兜底
const PUBLIC_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchTextWithFallback(url) {
  const errors = [];

  // —— 1. 代理链（/proxy → 本地 8766）——
  for (const buildUrl of PROXY_CANDIDATES) {
    const proxyUrl = buildUrl(url);
    try {
      const r = await fetch(proxyUrl, { cache: 'no-store' });
      if (r.ok) {
        const text = await r.text();
        // 过滤 502 错误响应（代理自己跑通了但目标 URL 被墙）
        if (text && text.length > 30 && !text.includes('"ok": false')) {
          return text;
        }
      } else if (r.status === 502) {
        const body = await r.text().catch(() => '');
        // Vercel Function 偶发超时或目标被墙，不要浪费错误次数
        if (body.includes('504') || body.includes('timeout')) {
          errors.push('代理超时');
        } else if (body.includes('ok') && body.includes('false')) {
          const m = body.match(/"error":\s*"([^"]+)"/);
          errors.push('代理: ' + (m ? m[1] : '目标 URL 无法访问'));
        }
      }
    } catch (e) {
      errors.push(proxyUrl.startsWith('/proxy') ? '同路径代理不可达（非 Vercel 环境）' : '本地代理未启动');
    }
  }

  // —— 2. 浏览器直连（少数源如 BBC feeds.bbci.co.uk 恰好放 CORS）——
  try {
    const r = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    if (r.ok) {
      const text = await r.text();
      if (text && text.length > 50) return text;
    }
  } catch (e) {
    errors.push('直连失败');
  }

  // —— 3. 公共 CORS 代理链 ——
  for (const buildUrl of PUBLIC_PROXIES) {
    try {
      const r = await fetch(buildUrl(url), { cache: 'no-store' });
      if (r.ok) {
        const text = await r.text();
        if (text && text.length > 50 && !text.toLowerCase().includes('access denied')) return text;
      }
    } catch (_) { /* 忽略，继续下一个 */ }
  }

  // 全部失败
  const lastErr = errors.filter(Boolean).slice(-1)[0] || '未知原因';
  const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const hint = isDev
    ? '请先启动本地代理：\n  cd /Users/taratara/Documents/trae_projects/juri && python3 api/proxy.py 8766'
    : 'Vercel 部署后请确认 api/proxy.py Function 正常运行';
  throw new Error(`无法拉取 ${url}：${lastErr}\n${hint}`);
}

async function fetchRSS(source) {
  const xml = await fetchTextWithFallback(source.url);
  return parseRSS(xml, source.id, source.lang || 'en');
}

// official 类型：部分官网也是 RSS（EDPB、WIPO），统一按 RSS 处理
async function fetchOfficialLikeRSS(source) {
  return fetchRSS(source);
}

const fetchers = {
  demo: async (source) => {
    await new Promise(r => setTimeout(r, 250));
    return demoArticles.filter(a => a.sourceId === source.id);
  },
  manual: async () => [],
  rss: fetchRSS,
  official: fetchOfficialLikeRSS,
  // 占位（真实接入需后端中转）
  api: async (source) => {
    throw new Error(`API 采集尚未实现：${source.url}（需后端中转，避免密钥暴露）`);
  },
  website: async (source) => {
    throw new Error(`网页采集尚未实现：${source.url}（需服务端抓取）`);
  },
};

export async function fetchSource(source, mode) {
  const useDemo = mode === 'demo';
  const fetcher = useDemo ? fetchers.demo : (fetchers[source.type] || fetchers.demo);
  try {
    const articles = await fetcher(source);
    return { ok: true, articles, source, fetchedAt: new Date().toISOString(), mode: useDemo ? 'demo' : 'real' };
  } catch (e) {
    return { ok: false, error: e.message, source, fetchedAt: new Date().toISOString(), mode: useDemo ? 'demo' : 'real' };
  }
}

export async function fetchAllSources(sources, mode) {
  const enabled = sources.filter(s => s.enabled);
  const results = [];
  for (const s of enabled) {
    results.push(await fetchSource(s, mode));
  }
  return results;
}

export function getSupportedTypes() {
  return Object.keys(fetchers);
}
