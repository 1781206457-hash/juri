// ===== 路由（hash-based）=====
import { parseRoute } from './navigation.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTopicList } from './views/topicList.js';
import { renderTopicDetail } from './views/topicDetail.js';
import { renderSources } from './views/sources.js';
import { renderSettings } from './views/settings.js';

const routes = {
  dashboard: renderDashboard,
  topics: renderTopicList,
  topic: renderTopicDetail,
  sources: renderSources,
  settings: renderSettings,
};

export function router() {
  const view = document.getElementById('view');
  const { name, params } = parseRoute();
  const handler = routes[name] || renderDashboard;
  handler(view, params);
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === name);
  });
}

export function initRouter() {
  window.addEventListener('hashchange', router);
  router();
}
