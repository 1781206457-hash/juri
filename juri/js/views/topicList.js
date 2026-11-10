// ===== 选题列表 =====
import { store } from '../store.js';
import { STATUS, STATUS_ORDER, DOMAINS } from '../constants.js';
import { relativeTime, escapeHtml, debounce } from '../utils.js';
import { statusPill, domainTags, emptyState } from '../ui.js';
import { navigate } from '../navigation.js';
import { topicCardHTML } from './dashboard.js';
import { findDuplicates } from '../services/dedup.js';

let filterState = {
  q: '',
  status: 'all',
  domain: 'all',
  lang: 'all',
  sort: 'score',
};

export function renderTopicList(container) {
  const s = store.getState();
  const { articles } = s;
  const { map: dupMap } = findDuplicates(s.topics, articles);

  container.innerHTML = `
    <div class="mb-16">
      <h2 style="margin:0 0 4px;font-size:20px">选题列表</h2>
      <div class="small muted">搜索、筛选、排序和批量管理所有选题</div>
    </div>

    <div class="filter-bar">
      <div class="search">
        <input id="searchInput" placeholder="搜索标题、摘要、术语、标签…" value="${escapeHtml(filterState.q)}" />
      </div>
      <select id="statusFilter">
        <option value="all">全部状态</option>
        ${STATUS_ORDER.map(k => `<option value="${k}" ${filterState.status === k ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}
      </select>
      <select id="domainFilter">
        <option value="all">全部领域</option>
        ${DOMAINS.map(d => `<option value="${d}" ${filterState.domain === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
      <select id="langFilter">
        <option value="all">全部语言</option>
        <option value="en" ${filterState.lang === 'en' ? 'selected' : ''}>English</option>
        <option value="zh" ${filterState.lang === 'zh' ? 'selected' : ''}>中文</option>
      </select>
      <select id="sortFilter">
        <option value="score" ${filterState.sort === 'score' ? 'selected' : ''}>推荐分数</option>
        <option value="newest" ${filterState.sort === 'newest' ? 'selected' : ''}>最新发布</option>
        <option value="domain" ${filterState.sort === 'domain' ? 'selected' : ''}>法律领域</option>
      </select>
    </div>

    <div class="flex-between mb-12">
      <div class="small muted" id="resultCount"></div>
      <div class="flex gap-8">
        <button class="btn btn-sm" id="batchSaveBtn">批量收藏</button>
        <button class="btn btn-sm" id="batchIgnoreBtn">批量忽略</button>
        <button class="btn btn-sm" id="selectAllBtn">全选</button>
      </div>
    </div>

    <div id="topicResults"></div>
  `;

  const applyFilters = () => {
    const results = filterAndSort(s);
    renderResults(results, articles, dupMap);
  };

  container.querySelector('#searchInput').addEventListener('input', debounce((e) => {
    filterState.q = e.target.value;
    applyFilters();
  }, 200));
  ['statusFilter', 'domainFilter', 'langFilter', 'sortFilter'].forEach(id => {
    container.querySelector('#' + id).addEventListener('change', (e) => {
      filterState[id.replace('Filter', '')] = e.target.value;
      applyFilters();
    });
  });

  container.querySelector('#selectAllBtn').addEventListener('click', () => {
    const checks = container.querySelectorAll('.topic-check');
    const allChecked = Array.from(checks).every(c => c.checked);
    checks.forEach(c => { c.checked = !allChecked; });
  });
  container.querySelector('#batchSaveBtn').addEventListener('click', () => batchSetStatus('saved', container));
  container.querySelector('#batchIgnoreBtn').addEventListener('click', () => batchSetStatus('ignored', container));

  applyFilters();
}

function batchSetStatus(status, container) {
  const ids = Array.from(container.querySelectorAll('.topic-check:checked')).map(c => c.dataset.id);
  if (ids.length === 0) {
    import('../ui.js').then(({ toast }) => toast('请先选择选题', 'error'));
    return;
  }
  ids.forEach(id => store.setTopicStatus(id, status));
  import('../ui.js').then(({ toast }) => toast(`已将 ${ids.length} 条设为「${STATUS[status].label}」`, 'success'));
  renderTopicList(container);
}

function filterAndSort(s) {
  let list = s.topics.slice();
  const q = filterState.q.trim().toLowerCase();
  if (q) {
    list = list.filter(t => {
      const art = s.articles.find(a => a.id === t.articleIds?.[0]);
      const hay = `${art?.title || ''} ${art?.summary || ''} ${t.tags.join(' ')} ${t.domains.join(' ')}`.toLowerCase();
      const termHit = s.terms.some(tm => tm.articleId === t.articleIds?.[0] && (tm.en.toLowerCase().includes(q) || (tm.zh || '').includes(q)));
      return hay.includes(q) || termHit;
    });
  }
  if (filterState.status !== 'all') list = list.filter(t => t.status === filterState.status);
  if (filterState.domain !== 'all') list = list.filter(t => t.domains.includes(filterState.domain));
  if (filterState.lang !== 'all') {
    list = list.filter(t => {
      const art = s.articles.find(a => a.id === t.articleIds?.[0]);
      return art && art.lang === filterState.lang;
    });
  }
  if (filterState.sort === 'score') list.sort((a, b) => b.totalScore - a.totalScore);
  else if (filterState.sort === 'newest') {
    list.sort((a, b) => {
      const aa = s.articles.find(x => x.id === a.articleIds?.[0])?.publishedAt || 0;
      const bb = s.articles.find(x => x.id === b.articleIds?.[0])?.publishedAt || 0;
      return new Date(bb) - new Date(aa);
    });
  } else if (filterState.sort === 'domain') {
    list.sort((a, b) => (a.domains[0] || '').localeCompare(b.domains[0] || ''));
  }
  return list;
}

function renderResults(list, articles, dupMap) {
  const container = document.getElementById('topicResults');
  const countEl = document.getElementById('resultCount');
  countEl.textContent = `共 ${list.length} 条选题`;

  if (list.length === 0) {
    container.innerHTML = emptyState('🔍', '没有匹配的选题', '试试调整筛选条件或关键词');
    return;
  }

  container.innerHTML = `
    <div class="topic-grid">
      ${list.map(t => {
        const card = topicCardHTML(t, articles, dupMap);
        // 注入勾选框
        return card.replace('<div class="topic-card"', `<div class="topic-card" style="position:relative"><label style="position:absolute;top:12px;right:12px;z-index:2"><input type="checkbox" class="topic-check" data-id="${t.id}" onclick="event.stopPropagation()"></label>`);
      }).join('')}
    </div>
  `;

  container.querySelectorAll('[data-topic-card]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.topic-card-actions') || e.target.classList.contains('topic-check')) return;
      navigate(`/topic/${el.dataset.topicCard}`);
    });
  });
  container.querySelectorAll('[data-quick-status]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      store.setTopicStatus(el.dataset.topicId, el.dataset.quickStatus);
      renderTopicList(document.getElementById('view'));
    });
  });
}
