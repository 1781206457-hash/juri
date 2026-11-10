// ===== 通用工具 =====

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return fmtDate(d) + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
}

export function daysAgo(d) {
  if (!d) return Infinity;
  const dt = new Date(d).getTime();
  return Math.floor((Date.now() - dt) / 86400000);
}

export function relativeTime(d) {
  const diff = daysAgo(d);
  if (diff <= 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return `${diff} 天前`;
  if (diff < 30) return `${Math.floor(diff / 7)} 周前`;
  return fmtDate(d);
}

export function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function round(n, p = 0) {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 简易分词（英文按空格/标点，中文按单字 + 英文词组保留）
export function tokenize(text) {
  if (!text) return [];
  const en = (text.match(/[a-zA-Z][a-zA-Z'-]{1,}/g) || []).map(s => s.toLowerCase());
  const zh = (text.match(/[\u4e00-\u9fa5]{2,}/g) || []);
  return [...en, ...zh];
}

// 标题相似度（基于 token 交集）
export function titleSimilarity(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach(t => { if (tb.has(t)) inter++; });
  return inter / Math.min(ta.size, tb.size);
}

export function debounce(fn, wait = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

export function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}
