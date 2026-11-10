// ===== 法律英语热词提取 =====
// 说明：演示数据中的术语为人工预设（标注为待核实）。真实接入时可替换为
// NLP / 词典匹配 / 大模型提取，并保留人工编辑入口。

export function extractTerms(article, allTerms) {
  // 优先返回该文章已存在的术语
  const existing = allTerms.filter(t => t.articleId === article.id);
  if (existing.length > 0) return existing;

  // 兜底：从文本中提取常见法律英语词组（简易规则，仅演示）
  const text = (article.title + ' ' + article.summary + ' ' + (article.background || '')).toLowerCase();
  const patterns = [
    { en: 'fair use', zh: '合理使用', isLegal: true, domain: '知识产权' },
    { en: 'due process', zh: '正当程序', isLegal: true, domain: '宪法行政法' },
    { en: 'jurisdiction', zh: '管辖权', isLegal: true, domain: '国际仲裁' },
    { en: 'liability', zh: '法律责任', isLegal: true, domain: '公司法' },
    { en: 'breach of contract', zh: '违约', isLegal: true, domain: '公司法' },
    { en: 'intellectual property', zh: '知识产权', isLegal: true, domain: '知识产权' },
    { en: 'privacy', zh: '隐私', isLegal: true, domain: '数据与隐私' },
    { en: 'antitrust', zh: '反垄断', isLegal: true, domain: '反垄断' },
  ];
  const found = patterns.filter(p => text.includes(p.en.toLowerCase()));
  return found.map(p => ({
    id: 'ext_' + Math.random().toString(36).slice(2, 8),
    articleId: article.id,
    ...p,
    pos: 'n.',
    context: findContext(article.title + '. ' + article.summary, p.en),
    verified: false,
    note: '自动提取，待核实',
  }));
}

function findContext(text, phrase) {
  const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + phrase.length + 40);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
