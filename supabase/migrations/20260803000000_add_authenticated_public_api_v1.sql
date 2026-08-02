-- Authenticated, read-only DLTV Public API v1.
-- This migration is intentionally not applied remotely by application code.

create extension if not exists pgcrypto;

alter table public.tournament_matches
  add column public_id text;

update public.tournament_matches
set public_id = 'mt_' || encode(gen_random_bytes(16), 'hex')
where public_id is null;

alter table public.tournament_matches
  alter column public_id set not null,
  alter column public_id set default ('mt_' || encode(gen_random_bytes(16), 'hex')),
  add constraint tournament_matches_public_id_format_check
    check (public_id ~ '^mt_[0-9a-f]{32}$'),
  add constraint tournament_matches_public_id_key unique (public_id);

create or replace function public.prevent_public_identifier_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.public_id is distinct from new.public_id then
    raise exception 'public identifier is immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger tournament_matches_public_id_immutable
before update of public_id on public.tournament_matches
for each row execute function public.prevent_public_identifier_change();

create or replace function public.prevent_published_slug_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.slug is not distinct from new.slug then
    return new;
  end if;
  if tg_table_name = 'published_tournaments' then
    if old.visibility_status = 'published' then
      raise exception 'published public slug is immutable' using errcode = '22023';
    end if;
  elsif exists (
      select 1 from public.published_tournaments p
      where p.submission_id = old.submission_id and p.visibility_status = 'published'
  ) then
    raise exception 'published public slug is immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger published_tournaments_slug_immutable
before update of slug on public.published_tournaments
for each row execute function public.prevent_published_slug_change();
create trigger tournament_stages_slug_immutable_after_publication
before update of slug on public.tournament_stages
for each row execute function public.prevent_published_slug_change();
create trigger tournament_teams_slug_immutable_after_publication
before update of slug on public.tournament_teams
for each row execute function public.prevent_published_slug_change();

create table public.api_access_requests (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text not null check (
    contact_email = lower(trim(contact_email)) and
    char_length(contact_email) <= 254 and
    contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  website_url text not null check (
    char_length(website_url) <= 2048 and website_url ~* '^https?://'
  ),
  intended_use text not null check (char_length(intended_use) between 20 and 4000),
  expected_request_volume text null check (char_length(expected_request_volume) <= 500),
  requested_endpoints text[] null,
  attribution_accepted boolean not null check (attribution_accepted),
  terms_accepted boolean not null check (terms_accepted),
  terms_version text not null check (terms_version = '2026-08-v1'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note text null check (char_length(admin_note) <= 4000),
  reviewed_by uuid null references public.admin_users(user_id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_access_requests_endpoint_allowlist check (
    requested_endpoints is null or requested_endpoints <@ array[
      'tournaments.list', 'tournaments.detail', 'stages.list', 'teams.list',
      'matches.list', 'bracket.read', 'standings.read'
    ]::text[]
  )
);

create table public.api_clients (
  id uuid primary key default gen_random_uuid(),
  access_request_id uuid null unique references public.api_access_requests(id) on delete set null,
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  client_slug text not null unique check (client_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(client_slug) <= 80),
  website_url text not null check (char_length(website_url) <= 2048 and website_url ~* '^https?://'),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  attribution_status text not null default 'not_reviewed' check (attribution_status in ('not_reviewed', 'compliant', 'non_compliant', 'grace_period')),
  attribution_checked_at timestamptz null,
  attribution_check_note text null check (char_length(attribution_check_note) <= 4000),
  default_rate_limit_per_minute integer not null default 60 check (default_rate_limit_per_minute between 1 and 10000),
  default_rate_limit_per_day integer not null default 10000 check (default_rate_limit_per_day between 1 and 10000000),
  allowed_origins text[] null,
  allowed_endpoints text[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_clients_endpoint_allowlist check (
    allowed_endpoints is null or allowed_endpoints <@ array[
      'tournaments.list', 'tournaments.detail', 'stages.list', 'teams.list',
      'matches.list', 'bracket.read', 'standings.read'
    ]::text[]
  )
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.api_clients(id) on delete cascade,
  key_prefix text not null check (key_prefix ~ '^dltv_(live|test)_[A-Za-z0-9_-]{6,16}$'),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  label text null check (char_length(label) <= 120),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked', 'expired')),
  last_used_at timestamptz null,
  expires_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  created_by uuid null references public.admin_users(user_id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint api_keys_revocation_consistency check (
    (status = 'revoked' and revoked_at is not null) or
    (status <> 'revoked' and revoked_at is null)
  )
);

create table public.api_usage_logs (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.api_clients(id) on delete cascade,
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  request_id uuid not null,
  api_version text not null check (api_version = 'v1'),
  endpoint text not null,
  method text not null check (method = 'GET'),
  response_status integer not null check (response_status between 100 and 599),
  duration_ms integer not null check (duration_ms >= 0),
  response_bytes integer null check (response_bytes is null or response_bytes >= 0),
  rate_limit_bucket text null,
  user_agent_safe text null check (char_length(user_agent_safe) <= 256),
  origin_safe text null check (char_length(origin_safe) <= 2048),
  created_at timestamptz not null default now()
);

create index api_usage_logs_client_created_idx on public.api_usage_logs(client_id, created_at desc);
create index api_usage_logs_key_created_idx on public.api_usage_logs(api_key_id, created_at desc);
create index api_usage_logs_endpoint_created_idx on public.api_usage_logs(endpoint, created_at desc);
create index api_usage_logs_status_created_idx on public.api_usage_logs(response_status, created_at desc);

create table public.api_rate_limit_buckets (
  client_id uuid not null references public.api_clients(id) on delete cascade,
  api_key_id uuid null references public.api_keys(id) on delete cascade,
  scope_type text not null check (scope_type in ('client', 'key')),
  scope_id uuid not null,
  bucket_kind text not null check (bucket_kind in ('minute', 'day')),
  bucket_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (scope_type, scope_id, bucket_kind, bucket_start),
  constraint api_rate_limit_scope_consistency check (
    (scope_type = 'client' and scope_id = client_id and api_key_id is null) or
    (scope_type = 'key' and scope_id = api_key_id and api_key_id is not null)
  )
);

create table public.api_audit_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'api_access_requested', 'api_access_approved', 'api_access_rejected',
    'api_client_created', 'api_client_settings_updated', 'api_client_suspended', 'api_client_reactivated', 'api_client_revoked',
    'api_key_created', 'api_key_rotated', 'api_key_suspended', 'api_key_revoked',
    'api_attribution_marked_compliant', 'api_attribution_marked_non_compliant',
    'api_rate_limit_updated'
  )),
  actor_id uuid null references public.admin_users(user_id) on delete set null,
  access_request_id uuid null references public.api_access_requests(id) on delete set null,
  client_id uuid null references public.api_clients(id) on delete set null,
  api_key_id uuid null references public.api_keys(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint api_audit_metadata_allowlist check (
    metadata - array['client_slug', 'key_prefix', 'status', 'rate_limit_per_minute', 'rate_limit_per_day', 'attribution_status', 'reason'] = '{}'::jsonb
  )
);

create index api_audit_events_client_created_idx on public.api_audit_events(client_id, created_at desc);
create index api_audit_events_request_created_idx on public.api_audit_events(access_request_id, created_at desc);

create or replace function public.api_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger api_access_requests_touch before update on public.api_access_requests
for each row execute function public.api_touch_updated_at();
create trigger api_clients_touch before update on public.api_clients
for each row execute function public.api_touch_updated_at();
create trigger api_keys_touch before update on public.api_keys
for each row execute function public.api_touch_updated_at();

create or replace function public.prevent_api_revocation_reversal()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'revoked' and new.status <> 'revoked' then
    raise exception 'revoked records cannot be reactivated' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger api_clients_irreversible_revocation before update of status on public.api_clients
for each row execute function public.prevent_api_revocation_reversal();
create trigger api_keys_irreversible_revocation before update of status on public.api_keys
for each row execute function public.prevent_api_revocation_reversal();

alter table public.api_access_requests enable row level security;
alter table public.api_clients enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_usage_logs enable row level security;
alter table public.api_rate_limit_buckets enable row level security;
alter table public.api_audit_events enable row level security;

revoke all on table public.api_access_requests, public.api_clients, public.api_keys,
  public.api_usage_logs, public.api_rate_limit_buckets, public.api_audit_events
  from anon, authenticated;
grant all on table public.api_access_requests, public.api_clients, public.api_keys,
  public.api_usage_logs, public.api_rate_limit_buckets, public.api_audit_events
  to service_role;
grant usage, select on sequence public.api_usage_logs_id_seq, public.api_audit_events_id_seq to service_role;

create or replace function public.submit_api_access_request(
  p_organization_name text,
  p_contact_name text,
  p_contact_email text,
  p_website_url text,
  p_intended_use text,
  p_expected_request_volume text,
  p_requested_endpoints text[],
  p_attribution_accepted boolean,
  p_terms_accepted boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.api_access_requests (
    organization_name, contact_name, contact_email, website_url, intended_use,
    expected_request_volume, requested_endpoints, attribution_accepted,
    terms_accepted, terms_version
  ) values (
    trim(p_organization_name), trim(p_contact_name), lower(trim(p_contact_email)),
    trim(p_website_url), trim(p_intended_use), nullif(trim(p_expected_request_volume), ''),
    p_requested_endpoints, p_attribution_accepted, p_terms_accepted, '2026-08-v1'
  ) returning id into v_id;
  insert into public.api_audit_events(event_type, access_request_id)
  values ('api_access_requested', v_id);
  return v_id;
end;
$$;
revoke all on function public.submit_api_access_request(text,text,text,text,text,text,text[],boolean,boolean) from public;
grant execute on function public.submit_api_access_request(text,text,text,text,text,text,text[],boolean,boolean) to anon, authenticated, service_role;

create or replace function public.approve_api_access_request(
  p_request_id uuid, p_reviewer_id uuid, p_client_slug text,
  p_rate_limit_per_minute integer, p_rate_limit_per_day integer,
  p_allowed_endpoints text[], p_allowed_origins text[], p_admin_note text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_request public.api_access_requests%rowtype; v_client public.api_clients%rowtype;
begin
  select * into v_request from public.api_access_requests where id = p_request_id for update;
  if not found then
    raise exception 'request was not found' using errcode = 'P0001';
  end if;
  if v_request.status = 'approved' then
    select * into v_client from public.api_clients where access_request_id = v_request.id;
    if found then
      return jsonb_build_object('client_id', v_client.id, 'client_slug', v_client.client_slug, 'idempotent', true);
    end if;
  end if;
  if v_request.status <> 'pending' then
    raise exception 'request is not pending' using errcode = 'P0001';
  end if;
  insert into public.api_clients(
    access_request_id, organization_name, client_slug, website_url,
    default_rate_limit_per_minute, default_rate_limit_per_day,
    allowed_endpoints, allowed_origins
  ) values (
    v_request.id, v_request.organization_name, lower(trim(p_client_slug)), v_request.website_url,
    p_rate_limit_per_minute, p_rate_limit_per_day, p_allowed_endpoints, p_allowed_origins
  ) returning * into v_client;
  update public.api_access_requests set status='approved', admin_note=nullif(trim(p_admin_note),''),
    reviewed_by=p_reviewer_id, reviewed_at=now() where id=v_request.id;
  insert into public.api_audit_events(event_type, actor_id, access_request_id, client_id, metadata)
  values ('api_access_approved', p_reviewer_id, v_request.id, v_client.id,
    jsonb_build_object('client_slug', v_client.client_slug));
  insert into public.api_audit_events(event_type, actor_id, access_request_id, client_id, metadata)
  values ('api_client_created', p_reviewer_id, v_request.id, v_client.id,
    jsonb_build_object('client_slug', v_client.client_slug));
  return jsonb_build_object('client_id', v_client.id, 'client_slug', v_client.client_slug);
end;
$$;
revoke all on function public.approve_api_access_request(uuid,uuid,text,integer,integer,text[],text[],text) from public;
grant execute on function public.approve_api_access_request(uuid,uuid,text,integer,integer,text[],text[],text) to service_role;

create or replace function public.reject_api_access_request(
  p_request_id uuid, p_reviewer_id uuid, p_admin_note text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_request public.api_access_requests%rowtype;
begin
  select * into v_request from public.api_access_requests where id = p_request_id for update;
  if not found then raise exception 'request was not found' using errcode = 'P0001'; end if;
  if v_request.status = 'rejected' then return jsonb_build_object('request_id', v_request.id, 'idempotent', true); end if;
  if v_request.status <> 'pending' then raise exception 'request is not pending' using errcode = 'P0001'; end if;
  update public.api_access_requests set status='rejected', admin_note=trim(p_admin_note),
    reviewed_by=p_reviewer_id, reviewed_at=now() where id=v_request.id;
  insert into public.api_audit_events(event_type, actor_id, access_request_id, metadata)
  values ('api_access_rejected', p_reviewer_id, v_request.id,
    jsonb_build_object('reason', left(trim(p_admin_note), 500)));
  return jsonb_build_object('request_id', v_request.id);
end;
$$;
revoke all on function public.reject_api_access_request(uuid,uuid,text) from public;
grant execute on function public.reject_api_access_request(uuid,uuid,text) to service_role;

create or replace function public.create_api_key(
  p_client_id uuid, p_key_prefix text, p_key_hash text, p_label text,
  p_expires_at timestamptz, p_actor_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_key_id uuid;
begin
  if not exists (select 1 from public.api_clients where id=p_client_id and status <> 'revoked') then
    raise exception 'client is unavailable' using errcode = 'P0001';
  end if;
  insert into public.api_keys(client_id, key_prefix, key_hash, label, expires_at, created_by)
  values (p_client_id, p_key_prefix, p_key_hash, nullif(trim(p_label),''), p_expires_at, p_actor_id)
  returning id into v_key_id;
  insert into public.api_audit_events(event_type, actor_id, client_id, api_key_id, metadata)
  values ('api_key_created', p_actor_id, p_client_id, v_key_id,
    jsonb_build_object('key_prefix', p_key_prefix));
  return v_key_id;
end;
$$;
revoke all on function public.create_api_key(uuid,text,text,text,timestamptz,uuid) from public;
grant execute on function public.create_api_key(uuid,text,text,text,timestamptz,uuid) to service_role;

create or replace function public.update_api_key_status(
  p_client_id uuid, p_key_id uuid, p_status text, p_actor_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_key public.api_keys%rowtype; v_event text;
begin
  select * into v_key from public.api_keys where id=p_key_id and client_id=p_client_id for update;
  if not found then raise exception 'key was not found' using errcode = 'P0001'; end if;
  if v_key.status = p_status then return jsonb_build_object('key_id', v_key.id, 'idempotent', true); end if;
  if v_key.status <> 'active' or p_status not in ('suspended','revoked') then
    raise exception 'invalid key transition' using errcode = 'P0001';
  end if;
  update public.api_keys set status=p_status,
    revoked_at=case when p_status='revoked' then now() else null end where id=v_key.id;
  v_event := case when p_status='revoked' then 'api_key_revoked' else 'api_key_suspended' end;
  insert into public.api_audit_events(event_type, actor_id, client_id, api_key_id, metadata)
  values (v_event, p_actor_id, p_client_id, v_key.id, jsonb_build_object('status', p_status));
  return jsonb_build_object('key_id', v_key.id, 'status', p_status);
end;
$$;
revoke all on function public.update_api_key_status(uuid,uuid,text,uuid) from public;
grant execute on function public.update_api_key_status(uuid,uuid,text,uuid) to service_role;

create or replace function public.update_api_client_settings(
  p_client_id uuid, p_status text, p_attribution_status text, p_attribution_note text,
  p_limit_per_minute integer, p_limit_per_day integer,
  p_allowed_endpoints text[], p_allowed_origins text[], p_actor_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_client public.api_clients%rowtype; v_event text;
begin
  select * into v_client from public.api_clients where id=p_client_id for update;
  if not found then raise exception 'client was not found' using errcode = 'P0001'; end if;
  if v_client.status='revoked' and p_status <> 'revoked' then
    raise exception 'revoked client cannot be reactivated' using errcode = 'P0001';
  end if;
  update public.api_clients set status=p_status, attribution_status=p_attribution_status,
    attribution_checked_at=case when p_attribution_status='not_reviewed' then null else now() end,
    attribution_check_note=nullif(trim(p_attribution_note),''),
    default_rate_limit_per_minute=p_limit_per_minute,
    default_rate_limit_per_day=p_limit_per_day,
    allowed_endpoints=p_allowed_endpoints, allowed_origins=p_allowed_origins
  where id=p_client_id;
  if v_client.status is distinct from p_status then
    v_event := case p_status when 'suspended' then 'api_client_suspended'
      when 'revoked' then 'api_client_revoked' else 'api_client_reactivated' end;
    insert into public.api_audit_events(event_type,actor_id,client_id,metadata)
    values (v_event,p_actor_id,p_client_id,jsonb_build_object('status',p_status));
  end if;
  if v_client.attribution_status is distinct from p_attribution_status and p_attribution_status in ('compliant','non_compliant') then
    v_event := case p_attribution_status when 'compliant' then 'api_attribution_marked_compliant'
      else 'api_attribution_marked_non_compliant' end;
    insert into public.api_audit_events(event_type,actor_id,client_id,metadata)
    values (v_event,p_actor_id,p_client_id,jsonb_build_object('attribution_status',p_attribution_status));
  end if;
  if v_client.default_rate_limit_per_minute is distinct from p_limit_per_minute or
     v_client.default_rate_limit_per_day is distinct from p_limit_per_day then
    insert into public.api_audit_events(event_type,actor_id,client_id,metadata)
    values ('api_rate_limit_updated',p_actor_id,p_client_id,
      jsonb_build_object('rate_limit_per_minute',p_limit_per_minute,'rate_limit_per_day',p_limit_per_day));
  end if;
  insert into public.api_audit_events(event_type,actor_id,client_id)
  values ('api_client_settings_updated',p_actor_id,p_client_id);
  return jsonb_build_object('client_id',p_client_id,'status',p_status);
end;
$$;
revoke all on function public.update_api_client_settings(uuid,text,text,text,integer,integer,text[],text[],uuid) from public;
grant execute on function public.update_api_client_settings(uuid,text,text,text,integer,integer,text[],text[],uuid) to service_role;

create or replace function public.consume_api_rate_limit(
  p_client_id uuid, p_api_key_id uuid, p_limit_per_minute integer, p_limit_per_day integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_minute timestamptz := date_trunc('minute', now());
declare v_day timestamptz := date_trunc('day', now());
declare v_client_minute integer; declare v_client_day integer;
declare v_key_minute integer; declare v_key_day integer;
begin
  insert into public.api_rate_limit_buckets(client_id, api_key_id, scope_type, scope_id, bucket_kind, bucket_start, request_count)
  values (p_client_id, null, 'client', p_client_id, 'minute', v_minute, 1)
  on conflict (scope_type, scope_id, bucket_kind, bucket_start)
  do update set request_count = public.api_rate_limit_buckets.request_count + 1
  returning request_count into v_client_minute;
  insert into public.api_rate_limit_buckets(client_id, api_key_id, scope_type, scope_id, bucket_kind, bucket_start, request_count)
  values (p_client_id, null, 'client', p_client_id, 'day', v_day, 1)
  on conflict (scope_type, scope_id, bucket_kind, bucket_start)
  do update set request_count = public.api_rate_limit_buckets.request_count + 1
  returning request_count into v_client_day;
  insert into public.api_rate_limit_buckets(client_id, api_key_id, scope_type, scope_id, bucket_kind, bucket_start, request_count)
  values (p_client_id, p_api_key_id, 'key', p_api_key_id, 'minute', v_minute, 1)
  on conflict (scope_type, scope_id, bucket_kind, bucket_start)
  do update set request_count = public.api_rate_limit_buckets.request_count + 1
  returning request_count into v_key_minute;
  insert into public.api_rate_limit_buckets(client_id, api_key_id, scope_type, scope_id, bucket_kind, bucket_start, request_count)
  values (p_client_id, p_api_key_id, 'key', p_api_key_id, 'day', v_day, 1)
  on conflict (scope_type, scope_id, bucket_kind, bucket_start)
  do update set request_count = public.api_rate_limit_buckets.request_count + 1
  returning request_count into v_key_day;
  return jsonb_build_object(
    'allowed', greatest(v_client_minute, v_key_minute) <= p_limit_per_minute and greatest(v_client_day, v_key_day) <= p_limit_per_day,
    'minute_count', greatest(v_client_minute, v_key_minute),
    'day_count', greatest(v_client_day, v_key_day),
    'minute_remaining', greatest(p_limit_per_minute - greatest(v_client_minute, v_key_minute), 0),
    'day_remaining', greatest(p_limit_per_day - greatest(v_client_day, v_key_day), 0),
    'reset_at', extract(epoch from (v_minute + interval '1 minute'))::bigint
  );
end;
$$;
revoke all on function public.consume_api_rate_limit(uuid,uuid,integer,integer) from public;
grant execute on function public.consume_api_rate_limit(uuid,uuid,integer,integer) to service_role;

create or replace function public.rotate_api_key(
  p_client_id uuid, p_old_key_id uuid, p_key_prefix text, p_key_hash text,
  p_label text, p_expires_at timestamptz, p_actor_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_old public.api_keys%rowtype; v_new_id uuid;
begin
  select * into v_old from public.api_keys
  where id = p_old_key_id and client_id = p_client_id for update;
  if not found or v_old.status <> 'active' then
    raise exception 'key is not active' using errcode = 'P0001';
  end if;
  insert into public.api_keys(client_id, key_prefix, key_hash, label, expires_at, created_by)
  values (p_client_id, p_key_prefix, p_key_hash, nullif(trim(p_label), ''), p_expires_at, p_actor_id)
  returning id into v_new_id;
  update public.api_keys set status = 'revoked', revoked_at = now()
  where id = p_old_key_id;
  insert into public.api_audit_events(event_type, actor_id, client_id, api_key_id, metadata)
  values ('api_key_rotated', p_actor_id, p_client_id, v_new_id,
    jsonb_build_object('key_prefix', p_key_prefix));
  insert into public.api_audit_events(event_type, actor_id, client_id, api_key_id, metadata)
  values ('api_key_revoked', p_actor_id, p_client_id, p_old_key_id,
    jsonb_build_object('status', 'revoked'));
  return v_new_id;
end;
$$;
revoke all on function public.rotate_api_key(uuid,uuid,text,text,text,timestamptz,uuid) from public;
grant execute on function public.rotate_api_key(uuid,uuid,text,text,text,timestamptz,uuid) to service_role;

comment on table public.api_usage_logs is
  'Public API metadata only. Retain 90 days; purge with an externally scheduled maintenance job.';
