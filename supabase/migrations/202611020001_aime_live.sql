-- Run in the Supabase SQL Editor as the project owner. Safe to re-run.
-- Public browser keys never grant unrestricted table access or expose edit credentials.
begin;
create schema if not exists aime_private;
revoke all on schema aime_private from public, anon, authenticated;

create table if not exists public.aime_live_sessions (
  id text primary key check (id ~ '^[a-f0-9]{32}$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  snapshot jsonb not null check (octet_length(snapshot::text) <= 500000),
  updated_at timestamptz not null default now()
);
create index if not exists aime_live_created_by_idx on public.aime_live_sessions(created_by);
create table if not exists aime_private.edit_keys (
  session_id text primary key references public.aime_live_sessions(id) on delete cascade,
  token_hash bytea not null check (octet_length(token_hash) = 32)
);
create table if not exists aime_private.members (
  session_id text not null references public.aime_live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (session_id, user_id)
);
alter table public.aime_live_sessions enable row level security;
alter table aime_private.edit_keys enable row level security;
alter table aime_private.members enable row level security;
revoke all on public.aime_live_sessions from public, anon, authenticated;
revoke all on all tables in schema aime_private from public, anon, authenticated;
grant select on public.aime_live_sessions to authenticated;

create or replace function public.aime_can_read(p_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from aime_private.members m where m.session_id = p_id and m.user_id = auth.uid());
$$;
revoke all on function public.aime_can_read(text) from public, anon, authenticated;
grant execute on function public.aime_can_read(text) to authenticated;
drop policy if exists aime_member_read on public.aime_live_sessions;
create policy aime_member_read on public.aime_live_sessions for select to authenticated using (public.aime_can_read(id));

create or replace function aime_private.validate_snapshot(p_snapshot jsonb)
returns void language plpgsql set search_path = '' as $$
declare palette jsonb; theme text; palette_name text; role_name text; colors jsonb; color jsonb; module jsonb;
begin
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or octet_length(p_snapshot::text) > 500000 then
    raise sqlstate 'PT400' using message = '无效或过大的方案';
  end if;
  if jsonb_typeof(p_snapshot #> '{aimeBoard,modules}') is distinct from 'array' then
    raise sqlstate 'PT400' using message = '缺少 Aime 图表';
  end if;
  if jsonb_array_length(p_snapshot #> '{aimeBoard,modules}') > 60 then
    raise sqlstate 'PT400' using message = '最多支持 60 个图表';
  end if;
  for module in select value from jsonb_array_elements(p_snapshot #> '{aimeBoard,modules}') loop
    if jsonb_typeof(module) is distinct from 'object' or coalesce(module->>'id','') !~ '^[A-Za-z0-9_-]{1,80}$' or coalesce(module->>'type','') !~ '^[A-Za-z0-9_-]{1,80}$' then
      raise sqlstate 'PT400' using message = '无效的图表模块';
    end if;
  end loop;
  foreach palette_name in array array['baseline','draft'] loop
    palette := p_snapshot->palette_name;
    if jsonb_typeof(palette) is distinct from 'object' or length(coalesce(palette->>'name','')) not between 1 and 80 then
      raise sqlstate 'PT400' using message = '无效的色板';
    end if;
    foreach theme in array array['light','dark'] loop
      foreach role_name in array array['categorical','semantic','surface'] loop
        colors := palette #> array['themes',theme,role_name];
        if jsonb_typeof(colors) is distinct from 'array' then raise sqlstate 'PT400' using message = '缺少颜色角色'; end if;
        if jsonb_array_length(colors) not between 1 and 64 or (role_name = 'semantic' and jsonb_array_length(colors) <> 2) or (role_name = 'surface' and jsonb_array_length(colors) <> 6) then
          raise sqlstate 'PT400' using message = '颜色数量不正确';
        end if;
        for color in select value from jsonb_array_elements(colors) loop
          if coalesce(color->>'hex','') !~ '^#[0-9a-fA-F]{6}$' then raise sqlstate 'PT400' using message = '无效的颜色值'; end if;
        end loop;
      end loop;
    end loop;
  end loop;
end;
$$;
revoke all on function aime_private.validate_snapshot(jsonb) from public, anon, authenticated;

create or replace function public.aime_create_live(p_snapshot jsonb, p_edit_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare record public.aime_live_sessions; new_id text;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message = '需要匿名会话'; end if;
  if p_edit_token is null or p_edit_token !~ '^[a-f0-9]{64}$' then raise sqlstate 'PT400' using message = '无效的编辑凭证'; end if;
  perform aime_private.validate_snapshot(p_snapshot);
  -- Serialize creation per user so concurrent tabs cannot bypass the per-user cap.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if (select count(*) from public.aime_live_sessions where created_by = auth.uid()) >= 100 then
    raise sqlstate 'PT429' using message = '当前用户最多创建 100 个实时方案';
  end if;
  new_id := replace(gen_random_uuid()::text, '-', '');
  insert into public.aime_live_sessions(id, created_by, snapshot) values(new_id, auth.uid(), p_snapshot) returning * into record;
  insert into aime_private.edit_keys values(new_id, sha256(convert_to(p_edit_token,'UTF8')));
  insert into aime_private.members values(new_id, auth.uid());
  return jsonb_build_object('id',record.id,'revision',record.revision,'snapshot',record.snapshot,'updatedAt',record.updated_at);
end;
$$;
create or replace function public.aime_join_live(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare record public.aime_live_sessions;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message = '需要匿名会话'; end if;
  select * into record from public.aime_live_sessions where id = p_id;
  if not found then raise sqlstate 'PT404' using message = '方案不存在'; end if;
  -- Knowing the unpredictable ID is the read capability. It never grants write access.
  insert into aime_private.members values(p_id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('id',record.id,'revision',record.revision,'snapshot',record.snapshot,'updatedAt',record.updated_at);
end;
$$;
create or replace function public.aime_update_live(p_id text, p_edit_token text, p_revision bigint, p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare record public.aime_live_sessions; stored_hash bytea;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message = '需要匿名会话'; end if;
  select * into record from public.aime_live_sessions where id = p_id for update;
  if not found then raise sqlstate 'PT404' using message = '方案不存在'; end if;
  select token_hash into stored_hash from aime_private.edit_keys where session_id = p_id;
  if p_edit_token is null or p_edit_token !~ '^[a-f0-9]{64}$' or sha256(convert_to(p_edit_token,'UTF8')) is distinct from stored_hash then
    raise sqlstate 'PT403' using message = '此链接只读，没有编辑权限';
  end if;
  if p_revision is distinct from record.revision then
    raise sqlstate 'PT409' using message = '其他编辑页已更新方案，为避免覆盖已暂停同步';
  end if;
  perform aime_private.validate_snapshot(p_snapshot);
  update public.aime_live_sessions set snapshot = p_snapshot, revision = revision + 1, updated_at = clock_timestamp() where id = p_id returning * into record;
  return jsonb_build_object('id',record.id,'revision',record.revision,'snapshot',record.snapshot,'updatedAt',record.updated_at);
end;
$$;
revoke all on function public.aime_create_live(jsonb,text) from public, anon, authenticated;
revoke all on function public.aime_join_live(text) from public, anon, authenticated;
revoke all on function public.aime_update_live(text,text,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.aime_create_live(jsonb,text) to authenticated;
grant execute on function public.aime_join_live(text) to authenticated;
grant execute on function public.aime_update_live(text,text,bigint,jsonb) to authenticated;

-- Publish only readable snapshots. Private edit hashes/memberships are never replicated.
do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'aime_live_sessions') then
    alter publication supabase_realtime add table public.aime_live_sessions;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
