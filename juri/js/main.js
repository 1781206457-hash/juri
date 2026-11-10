// ===== 应用入口 =====
import { store } from './store.js';
import { initRouter, router } from './router.js';
import { toast } from './ui.js';

function boot() {
  initRouter();

  // 顶部刷新按钮：重新采集（演示模式下重算评分）
  document.getElementById('refreshBtn').addEventListener('click', () => {
    store.refetch();
    toast('已重新采集（演示数据）', 'success');
    router();
  });

  // 数据模式徽标
  const badge = document.getElementById('dataBadge');
  const mode = store.getState().dataMode;
  badge.textContent = mode === 'demo' ? '演示数据' : '真实数据';
  badge.classList.toggle('real', mode !== 'demo');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
