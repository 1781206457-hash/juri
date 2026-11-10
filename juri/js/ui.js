// ===== 共享 UI 助手 =====
import { STATUS, PLATFORMS } from './constants.js';
import { escapeHtml, fmtDate, relativeTime } from './utils.js';

export function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

export function openModal(html, opts = {}) {
  const modal = document.getElementById('modal');
  const card = document.getElementById('modalCard');
  card.innerHTML = html;
  modal.hidden = false;
  card.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  if (opts.onMount) opts.onMount(card);
}
export function closeModal() {
  document.getElementById('modal').hidden = true;
}

export function statusPill(status) {
  const s = STATUS[status];
  if (!s) return '';
  return `<span class="status-pill ${s.cls}"><span class="tag-dot"></span>${s.label}</span>`;
}

export function platformBadge(platform) {
  const p = PLATFORMS[platform];
  if (!p) return '';
  return `<span class="tag" style="background:${p.color}1a;color:${p.color}">${p.label}</span>`;
}

export function domainTags(domains) {
  return (domains || []).map(d => `<span class="tag tag-domain">${escapeHtml(d)}</span>`).join('');
}

export function articleCard(article, source, opts = {}) {
  if (!article) return '<div class="empty">文章不存在</div>';
  const lang = article.lang === 'en' ? 'EN' : article.lang === 'zh' ? '中文' : '中英';
  return `
    <div class="card" style="margin-bottom:12px">
      <div class="panel-body">
        <div class="flex-between gap-12">
          <h3 style="margin:0;font-size:16px;line-height:1.5">${escapeHtml(article.title)}</h3>
          <span class="tag tag-source">${escapeHtml(source?.name || '未知来源')}</span>
        </div>
        <div class="topic-card-meta mt-8">
          <span>📅 ${relativeTime(article.publishedAt)}（${fmtDate(article.publishedAt)}）</span>
          <span>🌐 ${lang}</span>
          ${article.eventAt ? `<span>⚡ 事件：${fmtDate(article.eventAt)}</span>` : ''}
        </div>
        <p class="prose mt-12" style="color:var(--c-text-2)">${escapeHtml(article.summary)}</p>
        ${article.background ? `<p class="prose mt-8"><strong>报道背景：</strong>${escapeHtml(article.background)}</p>` : ''}
        <div class="mt-12">
          <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener">🔗 查看原文 →</a>
          ${article.parties?.length ? `<span class="muted small ml-12">涉及：${escapeHtml(article.parties.join('、'))}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function emptyState(icon, title, desc) {
  return `<div class="empty"><div class="icon">${icon}</div><div class="title">${escapeHtml(title)}</div><div class="desc">${escapeHtml(desc)}</div></div>`;
}

export function loadingState(text = '加载中…') {
  return `<div class="loading">${escapeHtml(text)}</div>`;
}
