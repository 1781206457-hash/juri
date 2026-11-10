// ===== 去重服务 =====
import { titleSimilarity } from '../utils.js';

const SIM_THRESHOLD = 0.55;

// 返回 { groups: [[topicId, topicId], ...], map: { topicId: [otherTopicIds] } }
export function findDuplicates(topics, articles) {
  const groups = [];
  const map = {};
  topics.forEach(t => { map[t.id] = []; });

  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const a = articles.find(x => x.id === topics[i].articleIds?.[0]);
      const b = articles.find(x => x.id === topics[j].articleIds?.[0]);
      if (!a || !b) continue;
      const sim = titleSimilarity(a.title, b.title);
      // 同领域 + 标题相似 才判定为重复
      const sameDomain = a.domains?.some(d => b.domains?.includes(d));
      if (sim >= SIM_THRESHOLD && sameDomain) {
        map[topics[i].id].push(topics[j].id);
        map[topics[j].id].push(topics[i].id);
        // 合并到已有组或新建组
        let placed = false;
        for (const g of groups) {
          if (g.includes(topics[i].id) || g.includes(topics[j].id)) {
            if (!g.includes(topics[i].id)) g.push(topics[i].id);
            if (!g.includes(topics[j].id)) g.push(topics[j].id);
            placed = true;
            break;
          }
        }
        if (!placed) groups.push([topics[i].id, topics[j].id]);
      }
    }
  }
  return { groups, map };
}
