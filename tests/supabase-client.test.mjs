import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseLiveClient } from '../dist/lib/supabase-sync.js';
import { discoverSyncBase, validateSupabaseConfig, readOwner, saveOwner } from '../dist/lib/live-sync.js';
const config = { provider: 'supabase', url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' };
const record = revision => ({ id: 'f'.repeat(32), revision, snapshot: { theme: revision > 1 ? 'dark' : 'light' }, updatedAt: '2026-11-02' });
const settle = () => new Promise(resolve => setImmediate(resolve));
function fixture({ signed = true } = {}) {
  const calls = [], timers = new Set(); let event, status, signedIn = 0, removed = 0, revision = 1, failure = null, createdClients = 0;
  const channel = { on(kind, filter, cb) { calls.push({ kind, filter }); event = cb; return this; }, subscribe(cb) { status = cb; return this; } };
  const sdk = { createClient(url, key, options) {
    createdClients++; assert.equal(options.auth.detectSessionInUrl, false);
    return {
      auth: { getSession: async () => ({ data: { session: signed ? { access_token: 'existing-user-jwt' } : null }, error: null }), signInAnonymously: async () => { signedIn++; return { data: { session: { access_token: 'new-user-jwt' } }, error: null }; } },
      realtime: { setAuth: async token => { calls.push({ realtimeAuth: token }); } },
      rpc: async (name, params) => { calls.push({ name, params }); return failure ? { error: failure, data: null } : { error: null, data: record(revision) }; },
      channel: () => { calls.push({ channelCreated: true }); return channel; },
      removeChannel: () => { removed++; }
    };
  } };
  const client = createSupabaseLiveClient(config, { sdkLoader: async () => sdk, setIntervalFn: callback => { timers.add(callback); return callback; }, clearIntervalFn: callback => timers.delete(callback) });
  return { client, calls, timers, status: value => status(value), event: row => event({ new: row }), revision: value => { revision = value; }, failure: value => { failure = value; }, counts: () => ({ signedIn, removed, createdClients }) };
}

test('Supabase adapter establishes one anonymous session and sends writes only through capability RPCs', async () => {
  const f = fixture({ signed: false });
  await f.client.create({ name: 'palette' }, 'token');
  await f.client.update('id', 'token', 7, { name: 'edited' });
  assert.deepEqual(f.calls[0], { realtimeAuth: 'new-user-jwt' });
  assert.deepEqual(f.calls[1], { name: 'aime_create_live', params: { p_snapshot: { name: 'palette' }, p_edit_token: 'token' } });
  assert.deepEqual(f.calls[2], { name: 'aime_update_live', params: { p_id: 'id', p_edit_token: 'token', p_revision: 7, p_snapshot: { name: 'edited' } } });
  assert.deepEqual(f.counts(), { signedIn: 1, removed: 0, createdClients: 1 });
});

test('Realtime subscription is session-scoped, catches reconnect gaps, ignores older events and closes cleanly', async () => {
  const f = fixture(), revisions = [], statuses = [];
  const close = f.client.subscribe('f'.repeat(32), row => revisions.push(row.revision), message => statuses.push(message));
  await settle();
  assert.deepEqual(revisions, [1]);
  assert.deepEqual(f.calls.slice(0, 3).map(call => Object.keys(call)[0]), ['realtimeAuth', 'name', 'channelCreated']);
  const filter = f.calls.find(c => c.kind === 'postgres_changes').filter;
  assert.equal(filter.filter, 'id=eq.' + 'f'.repeat(32)); assert.equal(filter.table, 'aime_live_sessions');
  f.revision(2); f.status('SUBSCRIBED'); await settle();
  assert.deepEqual(revisions, [1, 2]);
  f.event({ ...record(3), updated_at: 'now' }); f.event(record(2)); assert.deepEqual(revisions, [1, 2, 3]);
  f.status('CHANNEL_ERROR'); f.revision(4); await settle();
  for (const tick of f.timers) tick(); await settle();
  assert.equal(revisions.at(-1), 4); assert.ok(statuses.some(s => s.includes('自动检查')));
  close(); assert.equal(f.timers.size, 0); assert.equal(f.counts().removed, 1);
  f.event(record(5)); assert.equal(revisions.at(-1), 4);
});

test('early unsubscribe cannot leak a channel or background interval', async () => {
  const f = fixture(), received = [];
  const close = f.client.subscribe('f'.repeat(32), row => received.push(row), () => {});
  close(); await settle(); assert.equal(f.timers.size, 0); assert.equal(received.length, 0);
});

test('database permission/conflict errors retain HTTP-like statuses for the existing editor safeguards', async () => {
  const f = fixture();
  for (const code of ['PT403', 'PT409', 'PT404']) {
    f.failure({ code, message: 'database rejected request' });
    await assert.rejects(f.client.update('id', 'token', 1, {}), error => error.status === Number(code.slice(2)));
  }
});

test('cloud config works on localhost too, public key rotation preserves owner identity, and secret keys are refused', async () => {
  const result = await discoverSyncBase(new URL('http://127.0.0.1:4317/'), async () => ({ ok: true, json: async () => config }));
  assert.deepEqual(result, config);
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  saveOwner(storage, config, 'session', 'private-editor-capability');
  assert.equal(readOwner(storage, { ...config, publishableKey: 'sb_publishable_rotated' }, 'session'), 'private-editor-capability');
  assert.throws(() => validateSupabaseConfig({ ...config, publishableKey: 'sb_secret_do_not_ship' }), /服务端密钥/);
  const jwt = 'header.' + btoa(JSON.stringify({ role: 'service_role' })) + '.signature';
  assert.throws(() => validateSupabaseConfig({ ...config, publishableKey: jwt }), /service_role/);
  const anon = 'header.' + btoa(JSON.stringify({ role: 'anon' })) + '.signature';
  assert.equal(validateSupabaseConfig({ ...config, publishableKey: anon }).publishableKey, anon);
  assert.throws(() => validateSupabaseConfig({ ...config, url: 'http://project.supabase.co' }), /HTTPS/);
});

test('subscribing after loading a link does not join the session a second time', async () => {
  const f = fixture(), revisions = [];
  const id = 'f'.repeat(32), joins = () => f.calls.filter(call => call.name === 'aime_join_live').length;
  await f.client.get(id);
  assert.equal(joins(), 1);
  const close = f.client.subscribe(id, row => revisions.push(row.revision), () => {});
  await settle();
  assert.equal(joins(), 1);
  f.revision(2); f.status('SUBSCRIBED'); await settle();
  assert.equal(joins(), 2, 'the catch-up after subscribing closes the gap');
  assert.deepEqual(revisions, [2]);
  close();
});
