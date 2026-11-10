// ===== 导航工具（独立模块，避免循环依赖）=====
export function navigate(path) {
  location.hash = path;
}

export function parseRoute() {
  const hash = location.hash.slice(1) || '/dashboard';
  const parts = hash.split('/').filter(Boolean);
  const name = parts[0] || 'dashboard';
  const params = parts.slice(1);
  return { name, params };
}
