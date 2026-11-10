// ===== 选题详情页 =====
import { store } from '../store.js';
import { STATUS, STATUS_ORDER, SCORE_DIMS, PLATFORMS, DEMO_NOTICE } from '../constants.js';
import { fmtDate, fmtDateTime, escapeHtml } from '../utils.js';
import { statusPill, domainTags, articleCard, emptyState, toast, openModal, closeModal } from '../ui.js';
import { navigate } from '../navigation.js';
import { generateDraft } from '../services/draftGenerator.js';

let activeDraftPlatform = 'wechat';

export function renderTopicDetail(container, params) {
  const s = store.getState();
  const id = params[0];
  const topic = s.topics.find(t => t.id === id);
  if (!topic) {
    container.innerHTML = emptyState('❓', '选题不存在', '该选题可能已被删除');
    return;
  }
  const article = s.articles.find(a => a.id === topic.articleIds?.[0]);
  const relatedArticles = topic.articleIds.map(aid => s.articles.find(a => a.id === aid)).filter(Boolean);
  const source = article ? s.sources.find(x => x.id === article.sourceId) : null;
  const terms = s.terms.filter(t => t.articleId === article?.id);
  const drafts = s.drafts.filter(d => d.topicId === topic.id);
  const feedbacks = s.feedback.filter(f => f.topicId === topic.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const wechatDraft = drafts.find(d => d.platform === 'wechat');
  const xhsDraft = drafts.find(d => d.platform === 'xiaohongshu');

  container.innerHTML = `
    <div class="breadcrumb">
      <a href="#/topics">选题列表</a> / 选题详情
    </div>

    <div class="detail-layout">
      <div class="detail-main">
        <div class="card mb-16">
          <div class="panel-body">
            <div class="flex-between gap-12 mb-12">
              ${statusPill(topic.status)}
              <div class="flex gap-8" style="flex-wrap:wrap">
                ${domainTags(topic.domains)}
              </div>
            </div>
            <h1>${escapeHtml(article?.title || '无标题')}</h1>
            <div class="detail-meta mt-8">
              <span>📅 发布：${fmtDate(article?.publishedAt)}</span>
              ${article?.eventAt ? `<span>⚡ 事件：${fmtDate(article.eventAt)}</span>` : ''}
              <span>🌐 ${article?.lang === 'en' ? 'English' : article?.lang === 'zh' ? '中文' : '中英'}</span>
              <span>📰 ${escapeHtml(source?.name || '未知来源')}</span>
            </div>
          </div>
        </div>

        ${articleCard(article, source)}

        ${relatedArticles.length > 1 ? `
        <div class="card mb-16">
          <div class="panel-title"><h3>相关报道（${relatedArticles.length} 篇）</h3></div>
          <div class="panel-body">
            ${relatedArticles.map(a => `
              <div style="padding:10px 0;border-bottom:1px solid var(--c-border)">
                <a href="${escapeHtml(a.url)}" target="_blank" style="font-weight:500">${escapeHtml(a.title)}</a>
                <div class="small muted">${escapeHtml(s.sources.find(x => x.id === a.sourceId)?.name || '')} · ${fmtDate(a.publishedAt)}</div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        <div class="card mb-16">
          <div class="panel-title">
            <h3>📊 推荐评分与理由</h3>
            <span class="badge-demo">评分由规则引擎生成</span>
          </div>
          <div class="panel-body">
            <div class="flex gap-16 mb-16" style="align-items:center">
              <div class="score-ring" style="--score:${topic.totalScore};width:70px;height:70px" data-score="${topic.totalScore}"></div>
              <div style="flex:1">
                <div style="font-weight:600;margin-bottom:4px">综合推荐分</div>
                <div class="small muted">💡 ${escapeHtml(topic.reason || '暂无理由')}</div>
              </div>
              <button class="btn btn-sm" id="overrideScoreBtn">调整优先级</button>
            </div>
            <div class="score-breakdown">
              ${SCORE_DIMS.map(d => {
                const v = topic.scoreBreakdown?.[d.key] || 0;
                return `<div class="score-row">
                  <span class="label">${d.label}</span>
                  <div class="score-bar"><span style="width:${v}%"></span></div>
                  <span class="num">${v}</span>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="panel-title">
            <h3>📖 法律英语热词</h3>
            <div class="flex gap-8">
              <span class="badge-demo">释义待核实</span>
              <button class="btn btn-sm" id="addTermBtn">+ 添加术语</button>
            </div>
          </div>
          <div class="panel-body">
            ${terms.length === 0 ? emptyState('📝', '暂未提取到术语', '可手动添加或重新提取') : `
            <div class="term-list">
              ${terms.map(t => termItemHTML(t)).join('')}
            </div>`}
          </div>
        </div>

        <div class="card mb-16">
          <div class="panel-title"><h3>✅ 核实清单</h3></div>
          <div class="panel-body">
            <div class="small muted mb-12">以下问题需创作者人工核实；无法确认的内容请标记为「待核实」，不要自行补造法律结论。</div>
            <div class="checklist" id="checklist">
              ${(topic.verificationQuestions || []).map((q, i) => `
                <label class="check-item">
                  <input type="checkbox" data-q="${i}">
                  <span>${escapeHtml(q)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="panel-title">
            <h3>✍️ 平台内容角度与大纲</h3>
            <span class="badge-ai">草稿建议 · 可编辑</span>
          </div>
          <div class="panel-body">
            <div class="draft-tabs">
              <button class="draft-tab ${activeDraftPlatform === 'wechat' ? 'active' : ''}" data-pf="wechat">微信公众号</button>
              <button class="draft-tab ${activeDraftPlatform === 'xiaohongshu' ? 'active' : ''}" data-pf="xiaohongshu">小红书</button>
            </div>
            <div id="draftArea"></div>
          </div>
        </div>
      </div>

      <aside class="detail-side">
        <div class="card">
          <div class="panel-title"><h3>🎯 选题状态</h3></div>
          <div class="panel-body">
            <div class="chip-group" id="statusChips" style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              ${STATUS_ORDER.map(k => `
                <button class="chip ${topic.status === k ? 'active' : ''}" data-status="${k}">${STATUS[k].label}</button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="panel-title"><h3>📝 创作者备注</h3></div>
          <div class="panel-body">
            <textarea id="notesInput" rows="4" style="width:100%;padding:8px;border:1px solid var(--c-border-strong);border-radius:6px;resize:vertical" placeholder="记录创作思路、补充信息、写作提醒…">${escapeHtml(topic.notes || '')}</textarea>
            <div class="form-row mt-12">
              <label>自定义标签（逗号分隔）</label>
              <input id="tagsInput" value="${escapeHtml((topic.tags || []).join(', '))}" />
            </div>
            <div class="form-row">
              <label>计划发布日期</label>
              <input type="date" id="plannedDateInput" value="${topic.plannedDate ? fmtDate(topic.plannedDate) : ''}" />
            </div>
            <button class="btn btn-primary" id="saveMetaBtn" style="width:100%">保存备注与标签</button>
          </div>
        </div>

        <div class="card">
          <div class="panel-title"><h3>🏷 主题标签</h3></div>
          <div class="panel-body">
            <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:12px">
              ${domainTags(topic.domains)}
            </div>
            <button class="btn btn-sm" id="editDomainsBtn">编辑法律领域</button>
          </div>
        </div>

        <div class="card">
          <div class="panel-title"><h3>🕒 操作记录</h3></div>
          <div class="panel-body">
            <div class="timeline">
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div><div>创建选题</div><div class="timeline-time">${fmtDateTime(topic.createdAt)}</div></div>
              </div>
              <div class="timeline-item">
                <div class="timeline-dot" style="background:var(--c-text-3)"></div>
                <div><div>更新于 ${fmtDateTime(topic.updatedAt)}</div></div>
              </div>
              ${feedbacks.slice(0, 5).map(f => `
                <div class="timeline-item">
                  <div class="timeline-dot" style="background:${f.type === 'ignore' ? 'var(--c-red)' : 'var(--c-green)'}"></div>
                  <div>
                    <div>${f.type === 'ignore' ? '标记忽略' : f.type === 'adopt' ? '采纳 / 收藏' : f.platform ? `发布到 ${PLATFORMS[f.platform]?.label || f.platform}` : '反馈'}</div>
                    ${f.publishedUrl ? `<a href="${escapeHtml(f.publishedUrl)}" target="_blank" class="small">查看发布链接 →</a>` : ''}
                    ${f.note ? `<div class="small muted">${escapeHtml(f.note)}</div>` : ''}
                    <div class="timeline-time">${fmtDateTime(f.createdAt)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        ${topic.status === 'published' ? `
        <div class="card">
          <div class="panel-title"><h3>📈 发布反馈</h3></div>
          <div class="panel-body">
            ${feedbacks.filter(f => f.metrics).map(f => `
              <div class="kv-grid">
                <dt>平台</dt><dd>${PLATFORMS[f.platform]?.label || f.platform}</dd>
                <dt>发布日期</dt><dd>${fmtDate(f.publishedAt)}</dd>
                <dt>阅读</dt><dd>${f.metrics.views || 0}</dd>
                <dt>收藏</dt><dd>${f.metrics.collects || 0}</dd>
                <dt>评论</dt><dd>${f.metrics.comments || 0}</dd>
                <dt>主观评分</dt><dd>${'★'.repeat(f.rating || 0)}${'☆'.repeat(5 - (f.rating || 0))}</dd>
              </div>
            `).join('') || '<div class="small muted">暂无反馈数据</div>'}
          </div>
        </div>` : ''}
      </aside>
    </div>
  `;

  bindEvents(container, topic, article, terms, wechatDraft, xhsDraft);
}

function termItemHTML(t) {
  return `
    <div class="term-item" data-term="${t.id}">
      <div class="term-head">
        <span class="term-en">${escapeHtml(t.en)}</span>
        <span class="term-zh">${escapeHtml(t.zh || '')}</span>
        ${t.pos ? `<span class="tag">${escapeHtml(t.pos)}</span>` : ''}
        ${t.isLegal ? '<span class="tag tag-legal">法律术语</span>' : ''}
        <span class="tag ${t.verified ? 'tag-verified' : 'tag-pending'}">${t.verified ? '已核实' : '待核实'}</span>
        ${t.domain ? `<span class="tag tag-domain">${escapeHtml(t.domain)}</span>` : ''}
      </div>
      ${t.context ? `<div class="term-ctx">${escapeHtml(t.context)}</div>` : ''}
      <div class="term-meta">
        ${t.collocation ? `<span>搭配：${escapeHtml(t.collocation)}</span>` : ''}
        <span>来源：关联新闻原文</span>
      </div>
      <div class="flex gap-8 mt-8">
        <button class="btn btn-sm" data-edit-term="${t.id}">编辑</button>
        <button class="btn btn-sm" data-toggle-verify="${t.id}">${t.verified ? '标记待核实' : '标记已核实'}</button>
        <button class="btn btn-sm btn-danger" data-del-term="${t.id}">删除</button>
      </div>
    </div>
  `;
}

function renderDraftArea(topic, article, wechatDraft, xhsDraft) {
  const area = document.getElementById('draftArea');
  const draft = activeDraftPlatform === 'wechat' ? wechatDraft : xhsDraft;
  const pf = PLATFORMS[activeDraftPlatform];

  if (!draft) {
    area.innerHTML = `
      <div class="empty" style="padding:30px">
        <div class="title">暂无${pf.label}草稿</div>
        <div class="desc">点击下方按钮生成内容角度与大纲建议</div>
        <button class="btn btn-primary mt-12" id="genDraftBtn">生成${pf.label}草稿</button>
      </div>
    `;
    area.querySelector('#genDraftBtn').addEventListener('click', () => {
      const newDraft = generateDraft(topic, article, activeDraftPlatform, store.getState().settings);
      store.saveDraft(newDraft);
      toast(`已生成${pf.label}草稿`, 'success');
      renderTopicDetail(document.getElementById('view'), [topic.id]);
    });
    return;
  }

  area.innerHTML = `
    <div class="draft-block">
      <div class="draft-field">
        <label>标题方向 <span class="badge-ai">AI 草稿</span></label>
        <input data-draft="title" value="${escapeHtml(draft.title || '')}" />
      </div>
      <div class="draft-field">
        <label>内容切入角度</label>
        <textarea data-draft="angle">${escapeHtml(draft.angle || '')}</textarea>
      </div>
      <div class="draft-field">
        <label>内容大纲</label>
        <textarea data-draft="outline" rows="8">${escapeHtml(draft.outline || '')}</textarea>
      </div>
      ${draft.learningPoints?.length ? `
      <div class="draft-field">
        <label>学习收获 / 关键表达</label>
        <textarea data-draft="learningPoints" rows="3">${escapeHtml(draft.learningPoints.join('\n'))}</textarea>
      </div>` : ''}
      <div class="flex gap-8">
        <button class="btn btn-primary" id="saveDraftBtn">保存草稿</button>
        <button class="btn" id="regenDraftBtn">重新生成</button>
        <button class="btn" id="copyDraftBtn">复制全部</button>
      </div>
      <div class="small muted mt-8">⚠ 草稿为自动生成建议，不构成法律结论，发布前请人工核实所有法律事实与术语。</div>
    </div>
  `;

  area.querySelector('#saveDraftBtn').addEventListener('click', () => {
    const updated = { ...draft };
    area.querySelectorAll('[data-draft]').forEach(el => {
      const key = el.dataset.draft;
      updated[key] = key === 'learningPoints' ? el.value.split('\n').filter(Boolean) : el.value;
    });
    store.saveDraft(updated);
    toast('草稿已保存', 'success');
  });
  area.querySelector('#regenDraftBtn').addEventListener('click', () => {
    if (!confirm('重新生成将覆盖当前草稿，确定吗？')) return;
    const newDraft = generateDraft(topic, article, activeDraftPlatform, store.getState().settings);
    newDraft.id = draft.id;
    store.saveDraft(newDraft);
    toast('已重新生成', 'success');
    renderTopicDetail(document.getElementById('view'), [topic.id]);
  });
  area.querySelector('#copyDraftBtn').addEventListener('click', async () => {
    const text = `标题：${draft.title}\n\n角度：${draft.angle}\n\n大纲：\n${draft.outline}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('已复制到剪贴板', 'success');
    } catch {
      toast('复制失败，请手动选择', 'error');
    }
  });
}

function bindEvents(container, topic, article, terms, wechatDraft, xhsDraft) {
  // 状态切换
  container.querySelectorAll('#statusChips .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      store.setTopicStatus(topic.id, btn.dataset.status);
      toast(`状态已更新为「${STATUS[btn.dataset.status].label}」`, 'success');
      renderTopicDetail(container, [topic.id]);
    });
  });

  // 备注保存
  container.querySelector('#saveMetaBtn').addEventListener('click', () => {
    const notes = container.querySelector('#notesInput').value;
    const tags = container.querySelector('#tagsInput').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    const plannedDate = container.querySelector('#plannedDateInput').value || null;
    store.updateTopic(topic.id, { notes, tags, plannedDate: plannedDate ? new Date(plannedDate).toISOString() : null });
    toast('已保存', 'success');
  });

  // 评分覆盖
  container.querySelector('#overrideScoreBtn').addEventListener('click', () => {
    openModal(`
      <div class="modal-head"><h3>调整推荐优先级</h3><button class="icon-btn" data-close>✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <label>手动设置推荐分数（0-100，留空则恢复自动评分）</label>
          <input type="number" min="0" max="100" id="overrideInput" value="${topic.priorityOverride ?? ''}" placeholder="例如 85" />
        </div>
        <div class="small muted">手动覆盖后将不再随权重调整自动变化。</div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>取消</button>
        <button class="btn btn-primary" id="confirmOverride">确定</button>
      </div>
    `, {
      onMount: (card) => {
        card.querySelector('#confirmOverride').addEventListener('click', () => {
          const val = card.querySelector('#overrideInput').value;
          store.updateTopic(topic.id, { priorityOverride: val === '' ? null : Number(val) });
          closeModal();
          toast('优先级已更新', 'success');
          renderTopicDetail(container, [topic.id]);
        });
      }
    });
  });

  // 领域编辑
  container.querySelector('#editDomainsBtn').addEventListener('click', () => {
    openModal(`
      <div class="modal-head"><h3>编辑法律领域</h3><button class="icon-btn" data-close>✕</button></div>
      <div class="modal-body">
        <div class="chip-group" id="domainPicker" style="display:flex;flex-wrap:wrap;gap:6px">
          ${['知识产权','数据与隐私','人工智能','劳动法','公司法','国际贸易','刑事司法','反垄断','金融监管','环境法','国际仲裁','宪法行政法'].map(d => `
            <span class="chip ${topic.domains.includes(d) ? 'active' : ''}" data-domain="${d}">${d}</span>
          `).join('')}
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>取消</button>
        <button class="btn btn-primary" id="confirmDomains">确定</button>
      </div>
    `, {
      onMount: (card) => {
        const selected = new Set(topic.domains);
        card.querySelectorAll('[data-domain]').forEach(c => {
          c.addEventListener('click', () => {
            const d = c.dataset.domain;
            if (selected.has(d)) { selected.delete(d); c.classList.remove('active'); }
            else { selected.add(d); c.classList.add('active'); }
          });
        });
        card.querySelector('#confirmDomains').addEventListener('click', () => {
          store.updateTopic(topic.id, { domains: Array.from(selected) });
          closeModal();
          toast('领域已更新', 'success');
          renderTopicDetail(container, [topic.id]);
        });
      }
    });
  });

  // 术语操作
  container.querySelectorAll('[data-edit-term]').forEach(btn => {
    btn.addEventListener('click', () => editTermModal(btn.dataset.editTerm, () => renderTopicDetail(container, [topic.id])));
  });
  container.querySelectorAll('[data-toggle-verify]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleVerify;
      const term = terms.find(t => t.id === id);
      store.updateTerm(id, { verified: !term.verified });
      toast(term.verified ? '已标记为待核实' : '已标记为已核实', 'success');
      renderTopicDetail(container, [topic.id]);
    });
  });
  container.querySelectorAll('[data-del-term]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('确定删除该术语？')) {
        store.deleteTerm(btn.dataset.delTerm);
        toast('已删除', 'success');
        renderTopicDetail(container, [topic.id]);
      }
    });
  });
  container.querySelector('#addTermBtn').addEventListener('click', () => {
    editTermModal(null, () => renderTopicDetail(container, [topic.id]), article.id);
  });

  // 草稿 tab
  container.querySelectorAll('.draft-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeDraftPlatform = tab.dataset.pf;
      renderTopicDetail(container, [topic.id]);
    });
  });
  renderDraftArea(topic, article, wechatDraft, xhsDraft);
}

function editTermModal(termId, onDone, articleId) {
  const term = termId ? store.getState().terms.find(t => t.id === termId) : null;
  openModal(`
    <div class="modal-head"><h3>${term ? '编辑术语' : '添加术语'}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">
      <div class="form-row"><label>英文术语 *</label><input id="t_en" value="${escapeHtml(term?.en || '')}" /></div>
      <div class="form-row"><label>中文释义 *</label><input id="t_zh" value="${escapeHtml(term?.zh || '')}" /></div>
      <div class="form-row"><label>词性</label><input id="t_pos" value="${escapeHtml(term?.pos || '')}" placeholder="如 n. / v. / adj." /></div>
      <div class="form-row"><label>原文语境</label><textarea id="t_ctx" rows="3">${escapeHtml(term?.context || '')}</textarea></div>
      <div class="form-row"><label>常见搭配</label><input id="t_col" value="${escapeHtml(term?.collocation || '')}" /></div>
      <div class="form-row">
        <label>法律领域</label>
        <input id="t_domain" value="${escapeHtml(term?.domain || '')}" placeholder="如 知识产权" />
      </div>
      <div class="form-row">
        <label class="flex gap-8"><input type="checkbox" id="t_legal" ${term?.isLegal ? 'checked' : ''}> 属于法律术语</label>
      </div>
      <div class="form-row">
        <label class="flex gap-8"><input type="checkbox" id="t_verified" ${term?.verified ? 'checked' : ''}> 已核实（释义准确）</label>
      </div>
      <div class="small muted">⚠ 自动生成的释义请务必核实后再发布。</div>
    </div>
    <div class="modal-foot">
      <button class="btn" data-close>取消</button>
      <button class="btn btn-primary" id="saveTermBtn">保存</button>
    </div>
  `, {
    onMount: (card) => {
      card.querySelector('#saveTermBtn').addEventListener('click', () => {
        const data = {
          en: card.querySelector('#t_en').value.trim(),
          zh: card.querySelector('#t_zh').value.trim(),
          pos: card.querySelector('#t_pos').value.trim(),
          context: card.querySelector('#t_ctx').value.trim(),
          collocation: card.querySelector('#t_col').value.trim(),
          domain: card.querySelector('#t_domain').value.trim(),
          isLegal: card.querySelector('#t_legal').checked,
          verified: card.querySelector('#t_verified').checked,
        };
        if (!data.en || !data.zh) { toast('请填写英文术语和中文释义', 'error'); return; }
        if (termId) store.updateTerm(termId, data);
        else store.addTerm({ ...data, articleId, note: '手动添加' });
        closeModal();
        toast('术语已保存', 'success');
        onDone();
      });
    }
  });
}
