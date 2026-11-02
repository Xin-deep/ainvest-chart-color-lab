import { createSupabaseLiveClient } from './supabase-sync.js';
// The read URL contains a random session ID. Only the creator's browser holds the write capability.
const LIVE_OWNER_KEY = 'ainvest-live-owners:v1';
const ACTIVE_LIVE_KEY = 'ainvest-live-active:v1';
const LIVE_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/;
function createEditToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function syncIdentity(base) { return typeof base === 'string' ? base : 'supabase:' + base.url; }
function readOwner(storage, base, id) {
  try { return JSON.parse(storage.getItem(LIVE_OWNER_KEY) || '{}')[`${syncIdentity(base)}|${id}`] || null; } catch { return null; }
}
function saveOwner(storage, base, id, token) {
  const saved = JSON.parse(storage.getItem(LIVE_OWNER_KEY) || '{}');
  const owners = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  owners[`${syncIdentity(base)}|${id}`] = token;
  storage.setItem(LIVE_OWNER_KEY, JSON.stringify(owners));
}
function readActiveOwner(storage, base) {
  try {
    const id = JSON.parse(storage.getItem(ACTIVE_LIVE_KEY) || '{}')[syncIdentity(base)];
    return LIVE_ID_PATTERN.test(id) && readOwner(storage, base, id) ? id : null;
  } catch { return null; }
}
function saveActiveOwner(storage, base, id) {
  const saved = JSON.parse(storage.getItem(ACTIVE_LIVE_KEY) || '{}');
  const active = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  active[syncIdentity(base)] = id;
  storage.setItem(ACTIVE_LIVE_KEY, JSON.stringify(active));
}
function clearActiveOwner(storage, base) {
  if (!base) return;
  try {
    const saved = JSON.parse(storage.getItem(ACTIVE_LIVE_KEY) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      delete saved[syncIdentity(base)];
      storage.setItem(ACTIVE_LIVE_KEY, JSON.stringify(saved));
    }
  } catch { /* A corrupt hint cannot affect the stored edit credentials. */ }
}
function validateSupabaseConfig(config) {
  const url = new URL(config.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Supabase Project URL 需要有效的 HTTPS 根地址');
  const key = config.publishableKey;
  if (typeof key !== 'string' || key.startsWith('sb_secret_')) throw new Error('请使用 Publishable Key，不要使用服务端密钥');
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    let role;
    try { role = JSON.parse(atob(key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))).role; } catch { /* Reject unknown keys. */ }
    if (role !== 'anon') throw new Error('只接受 Publishable Key 或旧版 anon key，禁止使用 service_role');
  }
  return { provider: 'supabase', url: url.origin, publishableKey: key };
}
async function discoverSyncBase(locationLike = location, fetcher = fetch) {
  if (!/^https?:$/.test(locationLike.protocol)) throw new Error('离线文件不支持实时同步，请打开本地或在线预览地址');
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(locationLike.hostname);
  let config;
  try {
    const response = await fetcher(new URL('sync-config.json', locationLike.href), { cache: 'no-store' });
    if (response.ok) config = await response.json();
  } catch { /* The local Node demo can work without cloud configuration. */ }
  if (config?.provider === 'supabase' && (config.url || config.publishableKey)) return validateSupabaseConfig(config);
  if (config?.apiBase) {
    const url = new URL(config.apiBase);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('同步服务需要有效的 HTTPS 地址');
    return url.href.replace(/\/$/, '');
  }
  if (local) return locationLike.origin;
  throw new Error('Supabase 尚未配置，可以暂时使用静态快照');
}
function createLiveClient(base, options = {}) {
  if (base?.provider === 'supabase') return createSupabaseLiveClient(base, options);
  const { fetcher = fetch, EventSourceClass = globalThis.EventSource } = options;
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
export { LIVE_ID_PATTERN, createEditToken, readOwner, saveOwner, readActiveOwner, saveActiveOwner, clearActiveOwner, discoverSyncBase, createLiveClient, validateSupabaseConfig, syncIdentity };
