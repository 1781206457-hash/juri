// ===== 来源管理页 =====
import { store } from '../store.js';
import { SOURCE_TYPES, LANGS, DEMO_NOTICE } from '../constants.js';
import { fmtDateTime, escapeHtml } from '../utils.js';
import { toast, openModal, closeModal, emptyState } from '../ui.js';
import { fetchSource, fetchAllSources } from '../services/sourceFetcher.js';

export function renderSources(container) {
  const s = store.getState();
  const sources = s.sources;
  const enabledCount = sources.filter(x => x.enabled).length;

  container.innerHTML = `
    <div class="mb-16 flex-between">
      <div>
        <h2 style="margin:0 0 4px;font-size:20px">来源管理</h2>
        <div class="small muted">共 ${sources.length} 个来源，${enabledCount} 个已启用 · ${s.dataMode === 'demo' ? DEMO_NOTICE : '已接入真实来源'}</div>
      </div>
      <div class="flex gap-8">
        <button class="btn" id="fetchAllBtn">↻ 采集全部</button>
        <button class="btn btn-primary" id="addSourceBtn">+ 添加来源</button>
      </div>
    </div>

    <div class="card">
      <div class="panel-body" style="padding:0">
        <table class="table">
          <thead>
            <tr>
              <th>来源名称</th>
              <th>类型</th>
              <th>网址</th>
              <th>语言</th>
              <th>分类</th>
              <th>启用</th>
              <th>最后采集</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${sources.map(src => `
              <tr>
                <td><strong>${escapeHtml(src.name)}</strong><div class="small muted">${escapeHtml(src.desc || '')}</div></td>
                <td><span class="tag">${SOURCE_TYPES[src.type] || src.type}</span></td>
                <td><a href="${escapeHtml(src.url)}" target="_blank" class="small">${escapeHtml(src.url)}</a></td>
                <td>${LANGS[src.lang] || src.lang}</td>
                <td>${escapeHtml(src.category || '—')}</td>
                <td>
                  <label class="switch">
                    <input type="checkbox" ${src.enabled ? 'checked' : ''} data-toggle="${src.id}">
                    <span class="slider"></span>
                  </label>
                </td>
                <td class="small muted">${src.lastFetchedAt ? fmtDateTime(src.lastFetchedAt) : '从未'}</td>
                <td>
                  <button class="btn btn-sm" data-fetch="${src.id}">采集</button>
                  <button class="btn btn-sm" data-edit="${src.id}">编辑</button>
                  <button class="btn btn-sm btn-danger" data-del="${src.id}">删除</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${sources.length === 0 ? emptyState('📡', '暂无来源', '点击「添加来源」开始配置') : ''}
      </div>
    </div>

    <div class="card mt-16">
      <div class="panel-title"><h3>📋 接入说明</h3></div>
      <div class="panel-body prose" style="color:var(--c-text-2)">
        <p>• <strong>RSS / official 类型</strong>已接入真实采集，浏览器通过 CORS 代理（<code>api.allorigins.win</code> / <code>corsproxy.io</code>）拉取公开 RSS。</p>
        <p>• <strong>website / api 类型</strong>需后端中转（避免密钥暴露或 CORS），前端目前会报错提示。</p>
        <p>• 每条采集都会在 <code>sourceFetcher.js</code> 里的 <code>CORS_PROXIES</code> 链依次尝试代理，其中一个可用即可。</p>
        <p>• 采集成功后自动<strong>入库文章、去重、评分、生成选题</strong>，选题状态为"待筛选"。</p>
        <p>• <strong>来源条款</strong>：遵守原站使用条款，不绕过登录、付费墙。本工具仅用于个人学习研究。</p>
        <p class="small muted">💡 想重置为演示数据？到「偏好设置」最下方点「重置全部数据」。</p>
      </div>
    </div>
  `;

  // 事件
  container.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('change', () => {
      store.updateSource(el.dataset.toggle, { enabled: el.checked });
      toast(`已${el.checked ? '启用' : '停用'}`, 'success');
    });
  });
  container.querySelectorAll('[data-fetch]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const src = sources.find(s => s.id === btn.dataset.fetch);
      btn.disabled = true; btn.textContent = '采集中…';
      const res = await fetchSource(src, 'real');
      btn.disabled = false; btn.textContent = '采集';
      if (res.ok) {
        store.updateSource(src.id, { lastFetchedAt: res.fetchedAt });
        // 真实文章入库、自动生成选题
        const ingested = store.ingestArticles(res.articles);
        const modeLabel = res.mode === 'demo' ? '（演示数据）' : '（已入库）';
        toast(
          `完成：抓到 ${res.articles.length} 篇 → 新增 ${ingested.addedArticles} 篇、生成 ${ingested.addedTopics} 条选题${ingested.skipped ? `，跳过 ${ingested.skipped} 条重复` : ''} ${modeLabel}`,
          ingested.addedArticles ? 'success' : ''
        );
      } else {
        toast(`采集失败：${res.error}`, 'error');
      }
      renderSources(container);
    });
  });
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => editSourceModal(btn.dataset.edit, () => renderSources(container)));
  });
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('确定删除该来源？')) {
        store.deleteSource(btn.dataset.del);
        toast('已删除', 'success');
        renderSources(container);
      }
    });
  });
  container.querySelector('#addSourceBtn').addEventListener('click', () => editSourceModal(null, () => renderSources(container)));
  container.querySelector('#fetchAllBtn').addEventListener('click', async () => {
    const btn = container.querySelector('#fetchAllBtn');
    btn.disabled = true; btn.textContent = '采集中…';
    const results = await fetchAllSources(sources, 'real');
    btn.disabled = false; btn.textContent = '↻ 采集全部';
    let addedArticles = 0, addedTopics = 0;
    for (const r of results) {
      if (r.ok) {
        store.updateSource(r.source.id, { lastFetchedAt: r.fetchedAt });
        const ing = store.ingestArticles(r.articles);
        addedArticles += ing.addedArticles;
        addedTopics += ing.addedTopics;
      }
    }
    const ok = results.filter(r => r.ok).length;
    toast(`采集完成：${ok}/${results.length} 源成功，新增 ${addedArticles} 篇文章，生成 ${addedTopics} 条选题`, ok === results.length ? 'success' : '');
    renderSources(container);
  });
}

function editSourceModal(id, onDone) {
  const src = id ? store.getState().sources.find(s => s.id === id) : null;
  openModal(`
    <div class="modal-head"><h3>${src ? '编辑来源' : '添加来源'}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">
      <div class="form-row"><label>来源名称 *</label><input id="s_name" value="${escapeHtml(src?.name || '')}" /></div>
      <div class="form-row">
        <label>类型</label>
        <select id="s_type">
          ${Object.entries(SOURCE_TYPES).map(([k, v]) => `<option value="${k}" ${src?.type === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-row"><label>网址 *</label><input id="s_url" value="${escapeHtml(src?.url || '')}" placeholder="https://..." /></div>
      <div class="form-row">
        <label>语言</label>
        <select id="s_lang">
          ${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${src?.lang === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-row"><label>分类</label><input id="s_category" value="${escapeHtml(src?.category || '')}" placeholder="如 权威媒体 / 法院官网" /></div>
      <div class="form-row"><label>描述</label><textarea id="s_desc" rows="2">${escapeHtml(src?.desc || '')}</textarea></div>
      <div class="form-row"><label class="flex gap-8"><input type="checkbox" id="s_enabled" ${src?.enabled !== false ? 'checked' : ''}> 启用</label></div>
    </div>
    <div class="modal-foot">
      <button class="btn" data-close>取消</button>
      <button class="btn btn-primary" id="saveSourceBtn">保存</button>
    </div>
  `, {
    onMount: (card) => {
      card.querySelector('#saveSourceBtn').addEventListener('click', () => {
        const data = {
          name: card.querySelector('#s_name').value.trim(),
          type: card.querySelector('#s_type').value,
          url: card.querySelector('#s_url').value.trim(),
          lang: card.querySelector('#s_lang').value,
          category: card.querySelector('#s_category').value.trim(),
          desc: card.querySelector('#s_desc').value.trim(),
          enabled: card.querySelector('#s_enabled').checked,
        };
        if (!data.name || !data.url) { toast('请填写名称和网址', 'error'); return; }
        if (id) store.updateSource(id, data);
        else store.addSource(data);
        closeModal();
        toast('来源已保存', 'success');
        onDone();
      });
    }
  });
}
