import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { presets } from '../dist/data/presets.js';
let db;
const owner = '11111111-1111-4111-8111-111111111111', viewer = '22222222-2222-4222-8222-222222222222', outsider = '33333333-3333-4333-8333-333333333333';
const token = 'a'.repeat(64);
const snapshot = () => ({ baseline: structuredClone(presets[0]), draft: structuredClone(presets[0]), theme: 'light', mode: 'draft', aimeBoard: { catalogVersion: 3, columns: 1, density: 'compact', modules: [{ id: 'test-chart', type: 'line-multi' }] } });
const user = async uid => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]); await db.exec('set role authenticated'); };
const rpc = async (name, params) => (await db.query(`select public.${name}(${params.map((_, i) => '$' + (i + 1)).join(',')}) as value`, params)).rows[0].value;
const create = () => rpc('aime_create_live', [snapshot(), token]);
before(async () => {
  db = await PGlite.create();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${owner}'),('${viewer}'),('${outsider}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
  const migration = await readFile(new URL('../supabase/migrations/202611020001_aime_live.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Re-running setup must not relax policies or erase records.
});
after(async () => { await db?.close(); });

test('Supabase RLS prevents enumeration; joining by a read link grants only that session', async () => {
  await user(owner); const original = await create(), unrelated = await create();
  assert.equal('token_hash' in original, false);
  await user(viewer);
  assert.equal((await db.query('select * from public.aime_live_sessions')).rows.length, 0);
  const joined = await rpc('aime_join_live', [original.id]); assert.equal(joined.id, original.id);
  assert.deepEqual((await db.query('select id from public.aime_live_sessions')).rows.map(r => r.id), [original.id]);
  assert.equal((await db.query('select * from public.aime_live_sessions where id = $1', [unrelated.id])).rows.length, 0);
  await user(outsider); assert.equal((await db.query('select id from public.aime_live_sessions')).rows.length, 0);
});

test('readers cannot bypass write RPCs, read edit hashes or call helpers with elevated access', async () => {
  await user(owner); const original = await create();
  await user(viewer); await rpc('aime_join_live', [original.id]);
  await assert.rejects(rpc('aime_update_live', [original.id, 'b'.repeat(64), 1, snapshot()]), error => error.code === 'PT403');
  await assert.rejects(rpc('aime_update_live', [original.id, null, 1, snapshot()]), error => error.code === 'PT403');
  await assert.rejects(db.query('update public.aime_live_sessions set revision=999 where id=$1', [original.id]), /permission denied/);
  await assert.rejects(db.query('delete from public.aime_live_sessions where id=$1', [original.id]), /permission denied/);
  await assert.rejects(db.query('select * from aime_private.edit_keys'), /permission denied/);
  await assert.rejects(db.query('select * from aime_private.members'), /permission denied/);
  await db.exec('reset role; set role anon');
  await assert.rejects(rpc('aime_join_live', [original.id]), /permission denied/);
});

test('Supabase writes require the edit capability and matching revision; stale writes cannot overwrite', async () => {
  await user(owner); const original = await create();
  const edited = snapshot(); edited.draft.themes.light.categorical[0].hex = '#123456';
  const updated = await rpc('aime_update_live', [original.id, token, 1, edited]);
  assert.equal(updated.revision, 2); assert.equal(updated.snapshot.draft.themes.light.categorical[0].hex, '#123456');
  await assert.rejects(rpc('aime_update_live', [original.id, token, 1, snapshot()]), error => error.code === 'PT409');
  assert.equal((await rpc('aime_join_live', [original.id])).snapshot.draft.themes.light.categorical[0].hex, '#123456');
});

test('invalid payloads are rejected and copied sessions have separate identities and write credentials', async () => {
  await user(owner); const original = await create();
  const bad = snapshot(); bad.draft.themes.light.categorical[0].hex = 'url(injected)';
  await assert.rejects(rpc('aime_create_live', [bad, token]), error => error.code === 'PT400');
  await assert.rejects(rpc('aime_create_live', [{}, token]), error => error.code === 'PT400');
  await user(viewer); const source = await rpc('aime_join_live', [original.id]);
  const copy = await rpc('aime_create_live', [source.snapshot, 'c'.repeat(64)]);
  assert.notEqual(copy.id, original.id);
  const changed = source.snapshot; changed.theme = 'dark';
  await rpc('aime_update_live', [copy.id, 'c'.repeat(64), 1, changed]);
  assert.equal((await rpc('aime_join_live', [original.id])).snapshot.theme, 'light');
  await assert.rejects(rpc('aime_update_live', [original.id, 'c'.repeat(64), 1, changed]), error => error.code === 'PT403');
});

test('snapshots keep palette identity and saved palettes for viewers', async () => {
  await user(owner);
  const source = snapshot();
  source.draft.id = 'claude';
  source.saved = [{ ...structuredClone(presets[0]), id: 'plan-a', name: '方案 A' }];
  const created = await rpc('aime_create_live', [source, token]);
  await user(viewer);
  const joined = await rpc('aime_join_live', [created.id]);
  assert.equal(joined.snapshot.draft.id, 'claude');
  assert.deepEqual(joined.snapshot.saved.map(p => p.id), ['plan-a']);
});
