-- Run in the Supabase SQL Editor as the project owner, after 202611020001_aime_live.sql. Safe to re-run.
-- Full workbench backups, so a cleared browser or a new computer can get its palettes back from the ?edit= link.
-- Anyone who knows a session id can read its backup, including the edit token inside it: the owner chose id-only recovery.
begin;
create table if not exists aime_private.backups (
  session_id text primary key references public.aime_live_sessions(id) on delete cascade,
  revision bigint not null check (revision > 0),
  data jsonb not null check (octet_length(data::text) <= 1000000),
  updated_at timestamptz not null default now()
);
alter table aime_private.backups enable row level security;
revoke all on aime_private.backups from public, anon, authenticated;

create or replace function public.aime_save_backup(p_id text, p_edit_token text, p_revision bigint, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare stored_hash bytea; current_revision bigint; saved aime_private.backups;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message = '需要匿名会话'; end if;
  perform 1 from public.aime_live_sessions where id = p_id for update;
  if not found then raise sqlstate 'PT404' using message = '方案不存在'; end if;
  select token_hash into stored_hash from aime_private.edit_keys where session_id = p_id;
  if p_edit_token is null or p_edit_token !~ '^[a-f0-9]{64}$' or sha256(convert_to(p_edit_token,'UTF8')) is distinct from stored_hash then
    raise sqlstate 'PT403' using message = '此链接只读，没有编辑权限';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 1000000 then
    raise sqlstate 'PT400' using message = '无效或过大的备份';
  end if;
  select revision into current_revision from aime_private.backups where session_id = p_id;
  if p_revision is distinct from coalesce(current_revision, 0) then
    raise sqlstate 'PT409' using message = '备份已被其他页面更新';
  end if;
  insert into aime_private.backups(session_id, revision, data, updated_at) values(p_id, 1, p_data, clock_timestamp())
  on conflict (session_id) do update set revision = aime_private.backups.revision + 1, data = excluded.data, updated_at = excluded.updated_at
  returning * into saved;
  return jsonb_build_object('revision',saved.revision,'updatedAt',saved.updated_at);
end;
$$;
create or replace function public.aime_read_backup(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved aime_private.backups;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message = '需要匿名会话'; end if;
  perform 1 from public.aime_live_sessions where id = p_id;
  if not found then raise sqlstate 'PT404' using message = '方案不存在'; end if;
  select * into saved from aime_private.backups where session_id = p_id;
  if not found then return jsonb_build_object('revision',0,'data',null); end if;
  return jsonb_build_object('revision',saved.revision,'data',saved.data,'updatedAt',saved.updated_at);
end;
$$;
revoke all on function public.aime_save_backup(text,text,bigint,jsonb) from public, anon, authenticated;
revoke all on function public.aime_read_backup(text) from public, anon, authenticated;
grant execute on function public.aime_save_backup(text,text,bigint,jsonb) to authenticated;
grant execute on function public.aime_read_backup(text) to authenticated;
notify pgrst, 'reload schema';
commit;
