import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSyncServer } from '../scripts/sync-server.mjs';
import { presets } from '../dist/data/presets.js';
import { createLiveClient, readOwner, saveOwner, readActiveOwner, saveActiveOwner, clearActiveOwner, readViewerTheme, saveViewerTheme, readViewerPalette, readViewerScene, saveViewerScene, saveViewerPalette, isQuietLiveStatus, discoverSyncBase } from '../dist/lib/live-sync.js';
const token = 'a'.repeat(64);
const snapshot = () => ({ baseline: structuredClone(presets[0]), draft: structuredClone(presets[0]), aimeBoard: { catalogVersion: 3, platform: 'mobile', columns: 1, density: 'compact', modules: [{ id: 'chart-one', type: 'line-multi', count: 12, series: 3, fixture: 'aime-growth' }] }, theme: 'light', mode: 'draft', globalChartStyle: { lineWidth: 'inherit', texture: 'inherit' } });
async function fixture(t) {
  const dataDir = await mkdtemp(join(tmpdir(), 'aime-sync-'));
  const servers = [];
  const start = async () => {
    const server = createSyncServer({ dataDir, allowedOrigins: ['https://xin-deep.github.io'] });
    servers.push(server);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return { server, base: `http://127.0.0.1:${server.address().port}` };
  };
  t.after(async () => { for (const server of servers) { server.stopLiveClients(); server.closeAllConnections(); if (server.listening) await new Promise(resolve => server.close(resolve)); } await rm(dataDir, { recursive: true, force: true }); });
  return { ...await start(), dataDir, start };
}
async function api(base, path, method = 'GET', value, editToken) {
  const res = await fetch(base + '/api/sessions' + path, { method, headers: { ...(value ? { 'Content-Type': 'application/json' } : {}), ...(editToken ? { Authorization: 'Bearer ' + editToken } : {}) }, ...(value ? { body: JSON.stringify(value) } : {}) });
  return { status: res.status, data: await res.json() };
}

test('viewers cannot write even if they change the UI; only the separate edit capability authorizes updates', async t => {
  const { base, dataDir } = await fixture(t);
  const created = await api(base, '', 'POST', { snapshot: snapshot(), editToken: token });
  assert.equal(created.status, 201); assert.equal(created.data.revision, 1);
  assert.equal('editHash' in created.data, false); assert.equal('editToken' in created.data, false);
  const { id } = created.data;
  const disk = await readFile(join(dataDir, id + '.json'), 'utf8'); assert.ok(!disk.includes(token));
  assert.equal((await api(base, '/' + id)).status, 200);
  for (const credential of [undefined, 'b'.repeat(64)]) assert.equal((await api(base, '/' + id, 'PUT', { revision: 1, snapshot: snapshot() }, credential)).status, 403);
  const edited = snapshot(); edited.draft.themes.light.categorical[0].hex = '#123456';
  const result = await api(base, '/' + id, 'PUT', { revision: 1, snapshot: edited }, token);
  assert.equal(result.status, 200); assert.equal(result.data.revision, 2);
  assert.equal((await api(base, '/' + id)).data.snapshot.draft.themes.light.categorical[0].hex, '#123456');
});

test('two stale editor tabs cannot silently overwrite each other', async t => {
  const { base } = await fixture(t);
  const { data } = await api(base, '', 'POST', { snapshot: snapshot(), editToken: token });
  const results = await Promise.all(['#112233', '#445566'].map(color => { const next = snapshot(); next.draft.themes.light.categorical[0].hex = color; return api(base, '/' + data.id, 'PUT', { revision: 1, snapshot: next }, token); }));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await api(base, '/' + data.id)).data.revision, 2);
});

test('multiple viewers receive updates and reconnect to the latest revision without polling', async t => {
  const { base } = await fixture(t);
  const { data } = await api(base, '', 'POST', { snapshot: snapshot(), editToken: token });
  const readEvent = async reader => {
    let text = '';
    while (!text.includes('event: snapshot\ndata: ')) text += new TextDecoder().decode((await reader.read()).value);
    while (!text.split('data: ')[1].includes('\n\n')) text += new TextDecoder().decode((await reader.read()).value);
    return JSON.parse(text.split('data: ')[1].split('\n\n')[0]);
  };
  const one = (await fetch(base + '/api/sessions/' + data.id + '/events')).body.getReader();
  const two = (await fetch(base + '/api/sessions/' + data.id + '/events')).body.getReader();
  assert.equal((await readEvent(one)).revision, 1); assert.equal((await readEvent(two)).revision, 1);
  const next = snapshot(); next.theme = 'dark';
  await api(base, '/' + data.id, 'PUT', { revision: 1, snapshot: next }, token);
  for (const reader of [one, two]) { const event = await readEvent(reader); assert.equal(event.revision, 2); assert.equal(event.snapshot.theme, 'dark'); await reader.cancel(); }
  const reconnected = (await fetch(base + '/api/sessions/' + data.id + '/events')).body.getReader();
  assert.equal((await readEvent(reconnected)).revision, 2); await reconnected.cancel();
});

test('copies are independent and fixed session links survive a service restart', async t => {
  const { base, server, start } = await fixture(t);
  const client = createLiveClient(base), original = await client.create(snapshot(), token);
  const copy = await client.create((await client.get(original.id)).snapshot, 'b'.repeat(64));
  assert.notEqual(copy.id, original.id);
  const next = copy.snapshot; next.theme = 'dark';
  await client.update(copy.id, 'b'.repeat(64), 1, next);
  assert.equal((await client.get(original.id)).snapshot.theme, 'light');
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  const restarted = await start();
  assert.equal((await createLiveClient(restarted.base).get(copy.id)).snapshot.theme, 'dark');
});

test('invalid input and disallowed origins are rejected while configured Pages origin can connect', async t => {
  const { base } = await fixture(t);
  assert.equal((await api(base, '/invalid')).status, 404);
  assert.equal((await api(base, '', 'POST', { editToken: token, snapshot: {} })).status, 400);
  const invalid = snapshot(); invalid.draft.themes.light.categorical[0].hex = 'url(evil)';
  assert.equal((await api(base, '', 'POST', { editToken: token, snapshot: invalid })).status, 400);
  assert.equal((await fetch(base + '/api/health', { headers: { Origin: 'https://unapproved.example' } })).status, 403);
  const allowed = await fetch(base + '/api/health', { headers: { Origin: 'https://xin-deep.github.io' } });
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://xin-deep.github.io');
});

test('write credentials are browser-local, and production never falls back to an unconfigured or insecure backend', async () => {
  const storage = () => { const values = new Map(); return { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) }; };
  const owner = storage(), viewer = storage();
  saveOwner(owner, 'https://sync.example', 'abc', token);
  assert.equal(readOwner(owner, 'https://sync.example', 'abc'), token); assert.equal(readOwner(viewer, 'https://sync.example', 'abc'), null);
  assert.equal(await discoverSyncBase(new URL('http://127.0.0.1:4317/aime.html'), async () => ({ ok: false })), 'http://127.0.0.1:4317');
  const location = new URL('https://xin-deep.github.io/lab/aime.html');
  await assert.rejects(discoverSyncBase(location, async () => ({ ok: true, json: async () => ({ apiBase: '' }) })), /尚未配置/);
  await assert.rejects(discoverSyncBase(location, async () => ({ ok: true, json: async () => ({ apiBase: 'http://sync.example' }) })), /HTTPS/);
});

test('the same browser reuses its active fixed link and an explicit copy starts a separate scheme', () => {
  const values = new Map(), storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const base = { provider: 'supabase', url: 'https://project.supabase.co', publishableKey: 'sb_publishable_public' };
  const id = 'a'.repeat(32);
  saveActiveOwner(storage, base, id);
  assert.equal(readActiveOwner(storage, base), null); // A link alone cannot grant edit access.
  saveOwner(storage, base, id, token);
  assert.equal(readActiveOwner(storage, { ...base, publishableKey: 'sb_publishable_rotated' }), id);
  clearActiveOwner(storage, base);
  assert.equal(readActiveOwner(storage, base), null);
  assert.equal(readOwner(storage, base, id), token); // Existing editor links remain recoverable.
  const oldValues = new Map(), oldStorage = { getItem: key => oldValues.get(key) || null, setItem: (key, value) => oldValues.set(key, value) };
  saveOwner(oldStorage, base, id, token);
  assert.equal(readActiveOwner(oldStorage, base), id); // Upgrade reuses an existing fixed link.
  clearActiveOwner(oldStorage, base);
  assert.equal(readActiveOwner(oldStorage, base), null); // Explicit copy keeps its own new link.
});

test('viewer theme choice is stored locally, ignores invalid values and survives unavailable storage', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readViewerTheme(storage), null);
  saveViewerTheme(storage, 'dark');
  assert.equal(readViewerTheme(storage), 'dark');
  for (const key of values.keys()) values.set(key, 'sepia');
  assert.equal(readViewerTheme(storage), null);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readViewerTheme(blocked), null);
  assert.doesNotThrow(() => saveViewerTheme(blocked, 'dark'));
});

test('viewer palette choice is kept per link, can be cleared and tolerates corrupt or blocked storage', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readViewerPalette(storage, 'one'), null);
  saveViewerPalette(storage, 'one', 'claude');
  assert.equal(readViewerPalette(storage, 'one'), 'claude');
  assert.equal(readViewerPalette(storage, 'two'), null);
  saveViewerPalette(storage, 'one', null);
  assert.equal(readViewerPalette(storage, 'one'), null);
  for (const key of values.keys()) values.set(key, '{broken');
  assert.equal(readViewerPalette(storage, 'one'), null);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readViewerPalette(blocked, 'one'), null);
  assert.doesNotThrow(() => saveViewerPalette(blocked, 'one', 'claude'));
});

test('viewer scene choice is kept per link, ignores unknown scenes and tolerates corrupt or blocked storage', () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }, known = ['aime', 'financial'];
  assert.equal(readViewerScene(storage, 'one', known), null);
  saveViewerScene(storage, 'one', 'financial');
  assert.equal(readViewerScene(storage, 'one', known), 'financial');
  assert.equal(readViewerScene(storage, 'two', known), null);
  saveViewerScene(storage, 'one', 'retired');
  assert.equal(readViewerScene(storage, 'one', known), null);
  values.set('ainvest-live-viewer-scene:v1', '{broken');
  assert.equal(readViewerScene(storage, 'one', known), null);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readViewerScene(blocked, 'one', known), null);
  saveViewerScene(blocked, 'one', 'aime');
});

test('the sync service keeps palette identity and saved palettes for viewers', async t => {
  const { base } = await fixture(t);
  const source = snapshot();
  source.draft = { ...source.draft, id: 'claude' };
  source.saved = [{ ...structuredClone(presets[0]), id: 'plan-a', name: '方案 A' }];
  source.presetEdits = { ainvest: structuredClone(presets[0]) };
  source.financialBoard = { modules: [] };
  source.customBoard = { modules: [] };
  source.financialDensity = 'standard';
  source.customTemplate = 'free';
  source.lockedPalettes = ['claude', 7];
  source.comparisonBoards = {};
  const created = await api(base, '', 'POST', { snapshot: source, editToken: token });
  const { data } = await api(base, '/' + created.data.id);
  assert.equal(data.snapshot.draft.id, 'claude');
  assert.deepEqual(data.snapshot.saved.map(p => [p.id, p.name]), [['plan-a', '方案 A']]);
  assert.deepEqual(Object.keys(data.snapshot.presetEdits), ['ainvest']);
  assert.deepEqual(data.snapshot.financialBoard, { modules: [] });
  assert.deepEqual(data.snapshot.customBoard, { modules: [] });
  assert.equal(data.snapshot.financialDensity, 'standard');
  assert.equal(data.snapshot.customTemplate, 'free');
  assert.deepEqual(data.snapshot.lockedPalettes, ['claude']);
  assert.deepEqual(data.snapshot.comparisonBoards, {});
});

test('only routine sync states stay silent; connection and write problems stay visible', () => {
  for (const status of ['', '已连接 · 只读同步', '已同步 · 查看页面自动更新', '正在同步…']) assert.equal(isQuietLiveStatus(status), true, status);
  for (const status of ['正在连接共享方案…', '连接中断，正在重连', '连接中断，正在重试', '实时连接恢复中 · 自动检查更新', '暂未同步，正在重试', '同步已暂停 · 请重新载入或复制方案', '收到无效更新，请刷新重试']) assert.equal(isQuietLiveStatus(status), false, status);
});
