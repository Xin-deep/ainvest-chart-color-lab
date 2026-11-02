// The read URL contains a random session ID. Only the creator's browser holds the write capability.
const LIVE_OWNER_KEY = 'ainvest-live-owners:v1';
const LIVE_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/;
function createEditToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function readOwner(storage, base, id) {
  try { return JSON.parse(storage.getItem(LIVE_OWNER_KEY) || '{}')[`${base}|${id}`] || null; } catch { return null; }
}
function saveOwner(storage, base, id, token) {
  const saved = JSON.parse(storage.getItem(LIVE_OWNER_KEY) || '{}');
  const owners = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  owners[`${base}|${id}`] = token;
  storage.setItem(LIVE_OWNER_KEY, JSON.stringify(owners));
}
async function discoverSyncBase(locationLike = location, fetcher = fetch) {
  if (!/^https?:$/.test(locationLike.protocol)) throw new Error('离线文件不支持实时同步，请打开本地或在线预览地址');
  if (['127.0.0.1', 'localhost', '[::1]'].includes(locationLike.hostname)) return locationLike.origin;
  const response = await fetcher(new URL('sync-config.json', locationLike.href), { cache: 'no-store' });
  if (!response.ok) throw new Error('实时同步服务尚未配置');
  const config = await response.json();
  if (!config.apiBase) throw new Error('线上实时同步尚未启用，可以使用静态快照');
  const url = new URL(config.apiBase);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('同步服务需要有效的 HTTPS 地址');
  return url.href.replace(/\/$/, '');
}
function createLiveClient(base, { fetcher = fetch, EventSourceClass = globalThis.EventSource } = {}) {
  async function request(path, options = {}) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetcher(`${base}/api/sessions${path}`, { ...options, cache: 'no-store', signal: controller.signal });
      const data = await response.json();
      if (!response.ok) { const error = new Error(data.error || '同步服务暂不可用'); error.status = response.status; throw error; }
      return data;
    } finally { clearTimeout(timeout); }
  }
  return {
    create: (snapshot, token) => request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot, editToken: token }) }),
    get: id => request(`/${id}`),
    update: (id, token, revision, snapshot) => request(`/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ revision, snapshot }) }),
    subscribe(id, onSnapshot, onStatus) {
      const events = new EventSourceClass(`${base}/api/sessions/${id}/events`);
      events.onopen = () => onStatus('已连接 · 只读同步');
      events.onerror = () => onStatus('连接中断，正在重连');
      events.addEventListener('snapshot', event => { try { onSnapshot(JSON.parse(event.data)); } catch { onStatus('收到无效更新，请刷新重试'); } });
      return () => events.close();
    }
  };
}
export { LIVE_ID_PATTERN, createEditToken, readOwner, saveOwner, discoverSyncBase, createLiveClient };
