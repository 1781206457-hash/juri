// ===== 偏好设置页 =====
import { store } from '../store.js';
import { DOMAINS, SCORE_DIMS, PLATFORMS, DEFAULT_WEIGHTS } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../ui.js';

export function renderSettings(container) {
  const s = store.getState();
  const settings = s.settings;

  container.innerHTML = `
    <div class="mb-16">
      <h2 style="margin:0 0 4px;font-size:20px">偏好设置</h2>
      <div class="small muted">配置关注领域、关键词、平台和评分权重，影响推荐结果</div>
    </div>

    <div class="detail-layout" style="grid-template-columns:1fr">
      <div class="detail-main">
        <div class="card mb-16">
          <div class="panel-title"><h3>🎯 重点法律领域</h3></div>
          <div class="panel-body">
            <div class="chip-group" id="domainChips" style="display:flex;flex-wrap:wrap;gap:6px">
              ${DOMAINS.map(d => `
                <span class="chip ${settings.focusDomains.includes(d) ? 'active' : ''}" data-domain="${d}">${d}</span>
              `).join('')}
            </div>
            <div class="small muted mt-8">选中的领域在推荐评分中权重更高</div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="panel-title"><h3>🔑 关注关键词</h3></div>
          <div class="panel-body">
            <div class="form-row">
              <label>关键词（逗号分隔，中英文均可）</label>
              <input id="keywordsInput" value="${escapeHtml(settings.keywords.join(', '))}" placeholder="如 AI, GDPR, 反垄断" />
            </div>
            <button class="btn btn-primary" id="saveKwBtn">保存关键词</button>
          </div>
        </div>

        <div class="card mb-16">
          <div class="panel-title"><h3>👥 目标读者与内容定位</h3></div>
          <div class="panel-body">
            <div class="form-row">
              <label>目标读者</label>
              <input id="audienceInput" value="${escapeHtml(settings.audience || '')}" placeholder="如 法律英语学习者 / 法学生" />
            </div>
            <div class="form-row">
              <label>常用发布平台</label>
              <div class="flex gap-12">
                ${Object.values(PLATFORMS).map(p => `
                  <label class="flex gap-8"><input type="checkbox" class="pf-check" value="${p.key}" ${settings.platforms.includes(p.key) ? 'checked' : ''}> ${p.label}</label>
                `).join('')}
              </div>
            </div>
            <button class="btn btn-primary" id="saveAudBtn">保存</button>
          </div>
        </div>

        <div class="card mb-16">
          <div class="panel-title">
            <h3>⚖️ 推荐评分权重</h3>
            <button class="btn btn-sm" id="resetWeightsBtn">恢复默认</button>
          </div>
          <div class="panel-body">
            <div class="small muted mb-12">权重越高，该维度对总分影响越大。调整后所有选题评分将重新计算。</div>
            ${SCORE_DIMS.map(d => `
              <div class="weight-row">
                <span>${d.label}</span>
                <input type="range" min="0" max="3" step="0.1" data-weight="${d.key}" value="${settings.weights[d.key] ?? 1}" />
                <span class="text-right" id="wv_${d.key}">${(settings.weights[d.key] ?? 1).toFixed(1)}</span>
              </div>
            `).join('')}
            <button class="btn btn-primary mt-12" id="saveWeightsBtn">保存权重</button>
          </div>
        </div>

        <div class="card mb-16">
          <div class="panel-title"><h3>🔄 新闻更新</h3></div>
          <div class="panel-body">
            <div class="form-row">
              <label>更新频率</label>
              <select id="freqSelect">
                <option value="realtime" ${settings.fetchFrequency === 'realtime' ? 'selected' : ''}>实时</option>
                <option value="daily" ${settings.fetchFrequency === 'daily' ? 'selected' : ''}>每日</option>
                <option value="weekly" ${settings.fetchFrequency === 'weekly' ? 'selected' : ''}>每周</option>
              </select>
            </div>
            <button class="btn btn-primary" id="saveFreqBtn">保存</button>
          </div>
        </div>

        <div class="card mb-16">
          <div class="panel-title"><h3>⚠️ 数据管理</h3></div>
          <div class="panel-body">
            <p class="small muted">重置将清除所有本地数据并恢复演示数据。此操作不可撤销。</p>
            <button class="btn btn-danger" id="resetBtn">重置全部数据</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 领域多选
  const selDomains = new Set(settings.focusDomains);
  container.querySelectorAll('#domainChips .chip').forEach(c => {
    c.addEventListener('click', () => {
      const d = c.dataset.domain;
      if (selDomains.has(d)) { selDomains.delete(d); c.classList.remove('active'); }
      else { selDomains.add(d); c.classList.add('active'); }
      store.updateSettings({ focusDomains: Array.from(selDomains) });
      toast('已更新重点领域', 'success');
    });
  });

  // 关键词
  container.querySelector('#saveKwBtn').addEventListener('click', () => {
    const kws = container.querySelector('#keywordsInput').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    store.updateSettings({ keywords: kws });
    toast('关键词已保存', 'success');
  });

  // 读者/平台
  container.querySelector('#saveAudBtn').addEventListener('click', () => {
    const audience = container.querySelector('#audienceInput').value;
    const platforms = Array.from(container.querySelectorAll('.pf-check:checked')).map(c => c.value);
    store.updateSettings({ audience, platforms });
    toast('已保存', 'success');
  });

  // 权重
  container.querySelectorAll('[data-weight]').forEach(r => {
    r.addEventListener('input', () => {
      document.getElementById('wv_' + r.dataset.weight).textContent = Number(r.value).toFixed(1);
    });
  });
  container.querySelector('#saveWeightsBtn').addEventListener('click', () => {
    const weights = { ...settings.weights };
    container.querySelectorAll('[data-weight]').forEach(r => {
      weights[r.dataset.weight] = Number(r.value);
    });
    store.updateSettings({ weights });
    toast('权重已保存，评分已重算', 'success');
  });
  container.querySelector('#resetWeightsBtn').addEventListener('click', () => {
    store.updateSettings({ weights: { ...DEFAULT_WEIGHTS } });
    toast('已恢复默认权重', 'success');
    renderSettings(container);
  });

  // 频率
  container.querySelector('#saveFreqBtn').addEventListener('click', () => {
    store.updateSettings({ fetchFrequency: container.querySelector('#freqSelect').value });
    toast('已保存', 'success');
  });

  // 重置
  container.querySelector('#resetBtn').addEventListener('click', () => {
    if (confirm('确定重置全部数据？此操作不可撤销。')) {
      store.resetAll();
      toast('已重置为演示数据', 'success');
      renderSettings(container);
    }
  });
}
