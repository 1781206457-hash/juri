// ===== 工作台首页 =====
import { store } from '../store.js';
import { STATUS, STATUS_ORDER, DEMO_NOTICE } from '../constants.js';
import { fmtDate, relativeTime, escapeHtml } from '../utils.js';
import { statusPill, domainTags, emptyState } from '../ui.js';
import { navigate } from '../navigation.js';
import { findDuplicates } from '../services/dedup.js';

export function renderDashboard(container) {
  const s = store.getState();
  const topics = s.topics;
  const articles = s.articles;

  const todayCount = topics.filter(t => {
    const art = articles.find(a => a.id === t.articleIds?.[0]);
    return art && relativeTime(art.publishedAt) === '今天';
  }).length;
  const pendingCount = topics.filter(t => t.status === 'pending').length;
  const verifyingCount = topics.filter(t => t.status === 'verifying').length;
  const publishedCount = topics.filter(t => t.status === 'published').length;

  const { map: dupMap } = findDuplicates(topics, articles);

  const byStatus = {};
  STATUS_ORDER.forEach(k => byStatus[k] = topics.filter(t => t.status === k));

  // 今日推荐：按分数排序，取前 6
  const topRecs = topics
    .filter(t => t.status !== 'ignored' && t.status !== 'published')
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 6);

  container.innerHTML = `
    <div class="mb-16" style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <h2 style="margin:0 0 4px;font-size:20px">工作台</h2>
        <div class="small muted">${s.dataMode === 'demo' ? '⚠ ' + DEMO_NOTICE : '数据来源：已接入的新闻来源'} · 最后采集 ${fmtDate(s.lastFetchedAt)}</div>
      </div>
      <div class="flex gap-8">
        <button class="btn" id="goListBtn">查看全部选题 →</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--c-primary-soft);color:var(--c-primary)">📰</div>
        <div><div class="stat-num">${todayCount}</div><div class="stat-label">今日新推荐</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--c-orange-soft);color:var(--c-orange)">⏳</div>
        <div><div class="stat-num">${pendingCount}</div><div class="stat-label">待筛选</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--c-purple-soft);color:var(--c-purple)">🔍</div>
        <div><div class="stat-num">${verifyingCount}</div><div class="stat-label">待核实</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--c-green-soft);color:var(--c-green)">✓</div>
        <div><div class="stat-num">${publishedCount}</div><div class="stat-label">已发布</div></div>
      </div>
    </div>

    <div class="card mb-16">
      <div class="panel-title">
        <h3>状态看板</h3>
        <span class="small muted">共 ${topics.length} 条选题</span>
      </div>
      <div class="panel-body">
        <div class="kanban">
          ${STATUS_ORDER.map(key => `
            <div class="kanban-col" data-status="${key}">
              <div class="kanban-col-head">
                <span>${STATUS[key].icon} ${STATUS[key].label}</span>
                <span class="count">${byStatus[key].length}</span>
              </div>
              ${byStatus[key].slice(0, 4).map(t => {
                const art = articles.find(a => a.id === t.articleIds?.[0]);
                return `<div class="kanban-item" data-topic="${t.id}">
                  <div class="kanban-item-title">${escapeHtml(art?.title || '无标题')}</div>
                  <div class="kanban-item-meta">${art ? relativeTime(art.publishedAt) : ''} · ${t.totalScore}分</div>
                </div>`;
              }).join('')}
              ${byStatus[key].length > 4 ? `<div class="small muted" style="padding:4px 6px">+${byStatus[key].length - 4} 更多</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="panel-title">
        <h3>🔥 今日推荐（按推荐分数）</h3>
        <button class="btn btn-sm" id="moreRecBtn">查看全部 →</button>
      </div>
      <div class="panel-body">
        ${topRecs.length === 0 ? emptyState('📭', '暂无推荐', '调整偏好设置以获取更多推荐') : `
        <div class="topic-grid">
          ${topRecs.map(t => topicCardHTML(t, articles, dupMap)).join('')}
        </div>`}
      </div>
    </div>
  `;

  // 事件
  container.querySelector('#goListBtn')?.addEventListener('click', () => navigate('/topics'));
  container.querySelector('#moreRecBtn')?.addEventListener('click', () => navigate('/topics'));
  container.querySelectorAll('.kanban-item').forEach(el => {
    el.addEventListener('click', () => navigate(`/topic/${el.dataset.topic}`));
  });
  container.querySelectorAll('[data-topic-card]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.topic-card-actions')) return;
      navigate(`/topic/${el.dataset.topicCard}`);
    });
  });
  // 快捷状态按钮
  container.querySelectorAll('[data-quick-status]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      store.setTopicStatus(el.dataset.topicId, el.dataset.quickStatus);
      renderDashboard(container);
    });
  });
}

export function topicCardHTML(topic, articles, dupMap) {
  const art = articles.find(a => a.id === topic.articleIds?.[0]);
  if (!art) return '';
  const dups = (dupMap && dupMap[topic.id]) || [];
  return `
    <div class="topic-card" data-topic-card="${topic.id}">
      <div class="topic-card-head">
        <div class="score-ring" style="--score:${topic.totalScore}" data-score="${topic.totalScore}"></div>
        <div style="flex:1;min-width:0">
          <h4 class="topic-card-title">${escapeHtml(art.title)}</h4>
          <div class="topic-card-meta">
            <span>${relativeTime(art.publishedAt)}</span>
            <span>· ${escapeHtml(art.sourceId ? (articles[0] && 'src') : '')}</span>
          </div>
        </div>
      </div>
      <p class="topic-card-summary">${escapeHtml(art.summary)}</p>
      <div class="flex gap-8" style="flex-wrap:wrap">
        ${domainTags(topic.domains)}
        ${dups.length ? `<span class="tag tag-pending">🔗 ${dups.length} 条相似</span>` : ''}
      </div>
      <div class="topic-card-meta" style="color:var(--c-primary);font-size:12px">💡 ${escapeHtml(topic.reason || '')}</div>
      <div class="topic-card-foot">
        ${statusPill(topic.status)}
        <div class="topic-card-actions">
          <button class="icon-btn" title="收藏" data-quick-status="saved" data-topic-id="${topic.id}">★</button>
          <button class="icon-btn" title="待核实" data-quick-status="verifying" data-topic-id="${topic.id}">?</button>
          <button class="icon-btn" title="忽略" data-quick-status="ignored" data-topic-id="${topic.id}">✕</button>
        </div>
      </div>
    </div>
  `;
}
