// ===== 平台内容角度与大纲草稿生成（模板化 + 可编辑）=====
// 生成内容明确为草稿建议，不构成法律结论，未经专业审核。

import { uid } from '../utils.js';

export function generateDraft(topic, article, platform, settings) {
  const isXHS = platform === 'xiaohongshu';
  const terms = (article.terms || []).slice(0, isXHS ? 3 : 6);
  const domain = article.domains?.[0] || '法律';

  if (isXHS) {
    return {
      id: uid('draft'),
      topicId: topic.id,
      platform: 'xiaohongshu',
      title: suggestXHSTitle(article, terms),
      angle: suggestXHSAngle(article, terms, domain),
      outline: [
        `📌 切入点：用 1 个热门案例/事件引入「${terms[0]?.en || domain}」这个概念`,
        '📚 核心讲解：挑 2-3 个术语，配中文释义 + 1 句原文语境',
        '💡 学习收获：读者能记住的英文表达 + 对应的法律含义',
        '✨ 互动钩子：结尾提问「你还在哪些场景见过这个表达？」',
        '🏷 建议标签：#法律英语 #' + domain + ' #' + (terms[0]?.en || 'legalenglish'),
      ].join('\n'),
      learningPoints: terms.map(t => `${t.en} — ${t.zh}`),
      createdAt: new Date().toISOString(),
    };
  }

  // 公众号
  return {
    id: uid('draft'),
    topicId: topic.id,
    platform: 'wechat',
    title: suggestWechatTitle(article, domain),
    angle: suggestWechatAngle(article, terms, domain),
    outline: [
      '一、事件背景：用 200 字讲清新闻事实与关键时间线',
      '二、法律问题：提炼 1-2 个核心争议，明确适用的法律框架',
      '三、关键术语：逐词讲解英文原文、中文释义、语境与搭配',
      '四、规则分析：结合判决/法规原文（须附来源链接）说明法律适用',
      '五、延伸思考：对中国/跨境场景的借鉴意义',
      '六、术语总结表 + 延伸阅读链接',
    ].join('\n'),
    learningPoints: terms.map(t => `${t.en}（${t.pos}）— ${t.zh}：${t.context || ''}`),
    createdAt: new Date().toISOString(),
  };
}

function suggestXHSTitle(article, terms) {
  const t = terms[0];
  const short = article.title.length > 30 ? article.title.slice(0, 30) + '…' : article.title;
  if (t) {
    return `「${t.en}」到底什么意思？${t.zh}的正确法律用法`;
  }
  return `法律英语 | ${short}`;
}

function suggestXHSAngle(article, terms, domain) {
  const t = terms[0]?.en || domain;
  return `从「${article.title.slice(0, 25)}」这条新闻切入，重点讲 1-2 个高频法律英语术语「${t}」，用短句+对比的方式让读者秒懂用法和含义。内容控制在 300 字以内，适合图文卡片。`;
}

function suggestWechatTitle(article, domain) {
  const t = article.title;
  return `深度解析 | ${t.slice(0, 35)}${t.length > 35 ? '…' : ''}——兼论${domain}领域的法律英语表达`;
}

function suggestWechatAngle(article, terms, domain) {
  return `以「${article.title.slice(0, 30)}」为引子，深度分析背后的${domain}法律问题，重点讲解 ${terms.length} 个核心英文术语的法律含义、搭配与翻译要点，兼顾专业性与学习价值。篇幅建议 1500-2500 字。`;
}
