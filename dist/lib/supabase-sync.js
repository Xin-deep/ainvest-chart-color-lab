// Supabase owns persistence/auth/Realtime; private SQL functions check capabilities and revisions.
function createSupabaseLiveClient(config, { sdkLoader = () => import(new URL('../vendor/supabase.bundle.js', import.meta.url)), setIntervalFn = setInterval, clearIntervalFn = clearInterval } = {}) {
  let initialization;
  const ready = () => initialization ||= (async () => {
    const { createClient } = await sdkLoader();
    const client = createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const current = await client.auth.getSession();
    if (current.error) throw current.error;
    let session = current.data.session;
    if (!session) {
      const signed = await client.auth.signInAnonymously();
      if (signed.error) throw new Error('无法建立 Supabase 会话，请确认已开启 Anonymous Sign-Ins：' + signed.error.message);
      session = signed.data.session;
    }
    if (!session?.access_token) throw new Error('Supabase 未返回有效的匿名会话');
    // Wait until Realtime has the user JWT before subscribing; RLS otherwise sees the public key.
    await client.realtime.setAuth(session.access_token);
    return client;
  })().catch(error => { initialization = null; throw error; });
  const rpc = async (name, params) => {
    const client = await ready();
    const { data, error } = await client.rpc(name, params);
    if (error) {
      const status = /^PT\d{3}$/.test(error.code || '') ? Number(error.code.slice(2)) : error.code === '42501' ? 403 : error.code === 'PGRST202' ? 503 : 500;
      const failure = new Error(error.code === 'PGRST202' ? 'Supabase 数据库脚本尚未执行，请先完成初始化' : error.message || 'Supabase 暂不可用');
      failure.status = status; throw failure;
    }
    if (!data || typeof data.id !== 'string' || !Number.isSafeInteger(data.revision) || !data.snapshot) throw new Error('Supabase 返回了无效的方案');
    return data;
  };
  const adapter = {
    create: (snapshot, token) => rpc('aime_create_live', { p_snapshot: snapshot, p_edit_token: token }),
    get: id => rpc('aime_join_live', { p_id: id }),
    update: (id, token, revision, snapshot) => rpc('aime_update_live', { p_id: id, p_edit_token: token, p_revision: revision, p_snapshot: snapshot }),
    subscribe(id, onSnapshot, onStatus) {
      let stopped = false, client, channel, timer, reading = false, connected = false;
      let lastRevision = 0;
      const deliver = record => { if (!stopped && record.revision > lastRevision) { onSnapshot(record); lastRevision = record.revision; } };
      const refresh = async () => {
        if (stopped || reading) return;
        reading = true;
        try { deliver(await adapter.get(id)); if (!stopped && !connected) onStatus('实时连接恢复中 · 自动检查更新'); }
        catch { if (!stopped) onStatus('连接中断，正在重试'); }
        finally { reading = false; }
      };
      (async () => {
        client = await ready();
        // Join first so SELECT RLS and Realtime both authorize exactly this session.
        deliver(await adapter.get(id));
        if (stopped) return;
        channel = client.channel('aime-live:' + id + ':' + crypto.randomUUID());
        channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'aime_live_sessions', filter: `id=eq.${id}` }, payload => {
          const row = payload.new;
          try { deliver({ id: row.id, revision: row.revision, snapshot: row.snapshot, updatedAt: row.updated_at }); }
          catch { onStatus('收到无效更新，正在重新载入'); refresh(); }
        }).subscribe(status => {
          if (stopped) return;
          connected = status === 'SUBSCRIBED';
          if (connected) { onStatus('已连接 · 只读同步'); refresh(); }
          else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) { onStatus('实时连接恢复中 · 自动检查更新'); refresh(); }
        });
        // Periodic catch-up also covers suspended tabs, reconnect gaps and disabled publication.
        timer = setIntervalFn(refresh, 15000);
      })().catch(() => { if (!stopped) { onStatus('连接中断，正在重试'); timer = setIntervalFn(refresh, 3000); } });
      return () => { stopped = true; if (timer) clearIntervalFn(timer); if (channel) client.removeChannel(channel); };
    }
  };
  return adapter;
}
export { createSupabaseLiveClient };
