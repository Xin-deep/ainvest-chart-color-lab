import { createServer } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { restorePalette, restoreSavedPalettes } from '../dist/lib/palettes.js';
import { normalizeGlobalChartStyle } from '../dist/lib/chart-style.js';
const ID = /^[A-Za-z0-9_-]{32}$/;
const TOKEN = /^[a-f0-9]{64}$/;
const MAX_BODY = 500000;
function normalizeSnapshot(input) {
  if (!input || !Array.isArray(input.aimeBoard?.modules) || input.aimeBoard.modules.length > 60) throw new Error('无效的 Aime 方案');
  for (const module of input.aimeBoard.modules) {
    if (!module || typeof module.type !== 'string' || !/^[\w-]{1,80}$/.test(module.id) || !/^[\w-]{1,80}$/.test(module.type)) throw new Error('无效的图表模块');
  }
  return { version: 1, baseline: restorePalette(input.baseline), draft: restorePalette(input.draft), saved: restoreSavedPalettes(input.saved), aimeBoard: input.aimeBoard, theme: input.theme === 'dark' ? 'dark' : 'light', mode: input.mode === 'baseline' ? 'baseline' : 'draft', globalChartStyle: normalizeGlobalChartStyle(input.globalChartStyle) };
}
const hash = token => createHash('sha256').update(token).digest('hex');
export function createSyncServer({ root = resolve('dist'), dataDir = resolve('.data/live-sessions'), allowedOrigins = [] } = {}) {
  const listeners = new Map();
  let mutation = Promise.resolve();
  const serial = action => { const next = mutation.then(action); mutation = next.catch(() => {}); return next; };
  const file = id => resolve(dataDir, `${id}.json`);
  const publicRecord = record => ({ id: record.id, revision: record.revision, updatedAt: record.updatedAt, snapshot: record.snapshot });
  const load = async id => { try { return JSON.parse(await readFile(file(id), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
  const store = async record => {
    await mkdir(dataDir, { recursive: true });
    const temp = file(record.id) + '.tmp';
    await writeFile(temp, JSON.stringify(record), { mode: 0o600 });
    await rename(temp, file(record.id));
  };
  const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  const body = async req => {
    let size = 0; const parts = [];
    for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) { const error = new Error('方案过大'); error.status = 413; throw error; } parts.push(chunk); }
    try { return JSON.parse(Buffer.concat(parts).toString()); } catch { throw new Error('无效的 JSON'); }
  };
  const sendEvent = (res, record) => res.write(`event: snapshot\ndata: ${JSON.stringify(publicRecord(record))}\n\n`);
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) {
      const origin = req.headers.origin;
      if (origin && !allowedOrigins.includes(origin) && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) return json(res, 403, { error: '来源未获允许' });
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      try {
        if (pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true });
        if (pathname === '/api/sessions' && req.method === 'POST') {
          const input = await body(req);
          if (!TOKEN.test(input.editToken)) return json(res, 400, { error: '无效的编辑凭证' });
          const snapshot = normalizeSnapshot(input.snapshot);
          const record = await serial(async () => {
            await mkdir(dataDir, { recursive: true });
            if ((await readdir(dataDir)).length >= 5000) { const error = new Error('方案数量已达上限'); error.status = 503; throw error; }
            const record = { id: randomBytes(24).toString('base64url'), revision: 1, updatedAt: new Date().toISOString(), editHash: hash(input.editToken), snapshot };
            await store(record); return record;
          });
          return json(res, 201, publicRecord(record));
        }
        const match = pathname.match(/^\/api\/sessions\/([^/]+)(\/events)?$/);
        if (!match || !ID.test(match[1])) return json(res, 404, { error: '方案不存在' });
        const id = match[1];
        if (req.method === 'PUT' && !match[2]) {
          const input = await body(req);
          const result = await serial(async () => {
            const record = await load(id);
            if (!record) return { status: 404, value: { error: '方案不存在' } };
            const token = (req.headers.authorization || '').replace(/^Bearer /, '');
            if (!TOKEN.test(token) || !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(record.editHash))) return { status: 403, value: { error: '此链接只读，没有编辑权限' } };
            if (input.revision !== record.revision) return { status: 409, value: { error: '另一个编辑页面已更新方案。为避免覆盖，已暂停同步；请复制当前方案或重新载入线上版本。' } };
            record.snapshot = normalizeSnapshot(input.snapshot); record.revision++; record.updatedAt = new Date().toISOString();
            await store(record);
            for (const listener of listeners.get(id) || []) sendEvent(listener, record);
            return { status: 200, value: publicRecord(record) };
          });
          return json(res, result.status, result.value);
        }
        if (req.method !== 'GET') return json(res, 405, { error: '不支持此操作' });
        // Serialize subscribe with writes: every listener gets the latest record before future updates.
        await serial(async () => {
          const record = await load(id);
          if (!record) return json(res, 404, { error: '方案不存在' });
          if (!match[2]) return json(res, 200, publicRecord(record));
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
          res.write('retry: 1500\n\n'); sendEvent(res, record);
          const clients = listeners.get(id) || new Set(); clients.add(res); listeners.set(id, clients);
          const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 20000); heartbeat.unref();
          res.on('close', () => { clearInterval(heartbeat); clients.delete(res); if (!clients.size) listeners.delete(id); });
        });
      } catch (error) { if (!res.headersSent) json(res, error.status || 400, { error: error.status === 503 ? '同步服务暂不可用' : error.code ? '同步服务保存失败，请重试' : error.message }); }
      return;
    }
    try {
      const path = resolve(root, '.' + decodeURIComponent(pathname));
      if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      const target = path === root || path.endsWith(sep) ? resolve(path, 'index.html') : path;
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
      res.setHeader('Content-Type', types[extname(target)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store');
      res.end(await readFile(target));
    } catch { res.writeHead(404).end('Not found'); }
  });
  server.on('close', () => { for (const clients of listeners.values()) for (const res of clients) res.end(); });
  server.stopLiveClients = () => { for (const clients of listeners.values()) for (const res of clients) res.end(); };
  return server;
}
