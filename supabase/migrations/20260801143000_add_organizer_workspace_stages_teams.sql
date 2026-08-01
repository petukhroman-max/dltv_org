-- Organizer workspace access and audited stage/team mutations.
-- Existing operational tables remain private and are not recreated.

create table public.organizer_workspace_tokens (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null
    references public.tournament_submissions(id) on delete cascade,
  token_hash text not null unique,
  label text null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  last_used_at timestamptz null,
  created_by uuid not null references public.admin_users(user_id),
  created_at timestamptz not null default now(),
  constraint organizer_workspace_tokens_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint organizer_workspace_tokens_label_length
    check (label is null or char_length(label) between 1 and 100),
  constraint organizer_workspace_tokens_expiration_order
    check (expires_at > created_at),
  constraint organizer_workspace_tokens_revoked_order
    check (revoked_at is null or revoked_at >= created_at),
  constraint organizer_workspace_tokens_last_used_order
    check (last_used_at is null or last_used_at >= created_at)
);

create unique index organizer_workspace_tokens_one_active_idx
  on public.organizer_workspace_tokens(submission_id)
  where revoked_at is null;
create index organizer_workspace_tokens_submission_created_idx
  on public.organizer_workspace_tokens(submission_id, created_at desc);

alter table public.organizer_workspace_tokens enable row level security;
revoke all on table public.organizer_workspace_tokens
  from public, anon, authenticated;
grant all on table public.organizer_workspace_tokens to service_role;

create or replace function public.create_organizer_workspace_token(
  p_submission_id uuid,
  p_token_hash text,
  p_label text,
  p_expires_at timestamptz,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_token public.organizer_workspace_tokens;
  v_rotated boolean := false;
  v_event_type text;
begin
  if p_created_by is null or not exists (
    select 1 from public.admin_users where user_id = p_created_by
  ) then
    raise exception using errcode = '42501', message = 'workspace_link_not_authorized';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= now()
    or not (
      p_expires_at between now() + interval '6 days 23 hours'
        and now() + interval '7 days 1 hour'
      or p_expires_at between now() + interval '29 days 23 hours'
        and now() + interval '30 days 1 hour'
      or p_expires_at between now() + interval '89 days 23 hours'
        and now() + interval '90 days 1 hour'
    )
    or (p_label is not null and char_length(btrim(p_label)) not between 1 and 100)
  then
    raise exception using errcode = '22023', message = 'workspace_link_input_invalid';
  end if;

  perform 1 from public.tournament_submissions
  where id = p_submission_id
    and status in ('submitted', 'needs_changes', 'approved', 'published')
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'workspace_link_submission_invalid';
  end if;

  select exists (
    select 1 from public.organizer_workspace_tokens
    where submission_id = p_submission_id
      and revoked_at is null
      and expires_at > now()
  ) into v_rotated;

  update public.organizer_workspace_tokens
  set revoked_at = now()
  where submission_id = p_submission_id and revoked_at is null;

  insert into public.organizer_workspace_tokens (
    submission_id, token_hash, label, expires_at, created_by
  ) values (
    p_submission_id, p_token_hash, nullif(btrim(p_label), ''),
    p_expires_at, p_created_by
  ) returning * into v_token;

  v_event_type := case when v_rotated
    then 'workspace_link_rotated' else 'workspace_link_created' end;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, v_event_type, null, null, 'admin', p_created_by,
    jsonb_build_object(
      'expires_at', p_expires_at,
      'token_version', 'v1',
      'delivery_method', 'manual'
    )
  );

  return jsonb_build_object(
    'id', v_token.id,
    'submission_id', v_token.submission_id,
    'expires_at', v_token.expires_at,
    'created_at', v_token.created_at,
    'rotated', v_rotated
  );
end;
$$;

create or replace function public.revoke_organizer_workspace_token(
  p_submission_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if p_reviewer_id is null or not exists (
    select 1 from public.admin_users where user_id = p_reviewer_id
  ) then
    raise exception using errcode = '42501', message = 'workspace_link_not_authorized';
  end if;
  perform 1 from public.tournament_submissions
  where id = p_submission_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'workspace_link_submission_invalid';
  end if;

  update public.organizer_workspace_tokens
  set revoked_at = now()
  where submission_id = p_submission_id
    and revoked_at is null
    and expires_at > now();
  get diagnostics v_count = row_count;

  if v_count > 0 then
    insert into public.submission_events (
      submission_id, event_type, from_status, to_status,
      actor_type, actor_id, metadata
    ) values (
      p_submission_id, 'workspace_link_revoked', null, null,
      'admin', p_reviewer_id,
      jsonb_build_object(
        'token_version', 'v1',
        'delivery_method', 'manual'
      )
    );
  end if;
  return jsonb_build_object(
    'submission_id', p_submission_id,
    'revoked_count', v_count
  );
end;
$$;

create or replace function public.validate_organizer_workspace_access(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_token public.organizer_workspace_tokens;
  v_submission public.tournament_submissions;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v_token
  from public.organizer_workspace_tokens
  where token_hash = p_token_hash
  for update;
  if not found or v_token.revoked_at is not null or v_token.expires_at <= now() then
    return null;
  end if;
  select * into v_submission
  from public.tournament_submissions
  where id = v_token.submission_id
    and status in ('submitted', 'needs_changes', 'approved', 'published');
  if not found then
    return null;
  end if;
  update public.organizer_workspace_tokens
  set last_used_at = now()
  where id = v_token.id;
  return jsonb_build_object(
    'token_id', v_token.id,
    'submission', jsonb_build_object(
      'id', v_submission.id,
      'tournament_name', v_submission.tournament_name,
      'status', v_submission.status,
      'region', v_submission.region,
      'start_date', v_submission.start_date,
      'end_date', v_submission.end_date,
      'timezone', v_submission.timezone,
      'format', v_submission.format
    )
  );
end;
$$;

create or replace function public.assert_operational_mutation_access(
  p_submission_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.tournament_submissions
  where id = p_submission_id
  for update;
  if not found or v_status not in (
    'submitted', 'needs_changes', 'approved', 'published'
  ) then
    raise exception using errcode = '42501', message = 'operational_access_denied';
  end if;

  if p_actor_type = 'admin' then
    if p_actor_id is null or p_workspace_token_id is not null or not exists (
      select 1 from public.admin_users where user_id = p_actor_id
    ) then
      raise exception using errcode = '42501', message = 'operational_access_denied';
    end if;
  elsif p_actor_type = 'organizer_workspace' then
    if p_actor_id is not null or p_workspace_token_id is null or not exists (
      select 1 from public.organizer_workspace_tokens
      where id = p_workspace_token_id
        and submission_id = p_submission_id
        and revoked_at is null
        and expires_at > now()
    ) then
      raise exception using errcode = '42501', message = 'operational_access_denied';
    end if;
  else
    raise exception using errcode = '42501', message = 'operational_access_denied';
  end if;
end;
$$;

create or replace function public.operational_actor_metadata(p_actor_type text)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case when p_actor_type = 'organizer_workspace'
    then jsonb_build_object(
      'access_method', 'workspace_link',
      'workspace_version', 'v1'
    )
    else '{}'::jsonb end;
$$;

create or replace function public.create_tournament_stage(
  p_submission_id uuid,
  p_payload jsonb,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_stage public.tournament_stages;
  v_slug text;
  v_base text;
  v_suffix integer := 2;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array[
      'name','slug','stage_type','sequence_number','start_at','end_at',
      'timezone','format_text','best_of_default','team_count','is_online',
      'location_name','status','is_public'
    ]::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'stage_input_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text, 11));
  v_base := p_payload ->> 'slug';
  v_slug := v_base;
  while exists (
    select 1 from public.tournament_stages
    where submission_id = p_submission_id and slug = v_slug
  ) loop
    v_slug := left(v_base, 100 - char_length(v_suffix::text) - 1)
      || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  insert into public.tournament_stages (
    submission_id, name, slug, stage_type, sequence_number, start_at, end_at,
    timezone, format_text, best_of_default, team_count, is_online,
    location_name, status, is_public
  ) values (
    p_submission_id, btrim(p_payload ->> 'name'), v_slug,
    p_payload ->> 'stage_type', (p_payload ->> 'sequence_number')::integer,
    (p_payload ->> 'start_at')::timestamptz,
    (p_payload ->> 'end_at')::timestamptz,
    nullif(btrim(p_payload ->> 'timezone'), ''),
    nullif(btrim(p_payload ->> 'format_text'), ''),
    (p_payload ->> 'best_of_default')::integer,
    (p_payload ->> 'team_count')::integer,
    (p_payload ->> 'is_online')::boolean,
    nullif(btrim(p_payload ->> 'location_name'), ''),
    p_payload ->> 'status', (p_payload ->> 'is_public')::boolean
  ) returning * into v_stage;

  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'stage_created', null, null,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_stage.id,
      'entity_name', v_stage.name,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return jsonb_build_object(
    'id', v_stage.id, 'submission_id', v_stage.submission_id,
    'name', v_stage.name, 'slug', v_stage.slug,
    'updated_at', v_stage.updated_at
  );
exception when unique_violation then
  raise exception using errcode = '23505', message = 'stage_sequence_conflict';
end;
$$;

create or replace function public.update_tournament_stage(
  p_submission_id uuid,
  p_stage_id uuid,
  p_expected_updated_at timestamptz,
  p_payload jsonb,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_old public.tournament_stages;
  v_stage public.tournament_stages;
  v_changed jsonb;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array[
      'name','stage_type','sequence_number','start_at','end_at','timezone',
      'format_text','best_of_default','team_count','is_online','location_name',
      'status','is_public'
    ]::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'stage_input_invalid';
  end if;
  select * into v_old from public.tournament_stages
  where id = p_stage_id and submission_id = p_submission_id
    and updated_at = p_expected_updated_at
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'operational_conflict';
  end if;

  update public.tournament_stages set
    name = btrim(p_payload ->> 'name'),
    stage_type = p_payload ->> 'stage_type',
    sequence_number = (p_payload ->> 'sequence_number')::integer,
    start_at = (p_payload ->> 'start_at')::timestamptz,
    end_at = (p_payload ->> 'end_at')::timestamptz,
    timezone = nullif(btrim(p_payload ->> 'timezone'), ''),
    format_text = nullif(btrim(p_payload ->> 'format_text'), ''),
    best_of_default = (p_payload ->> 'best_of_default')::integer,
    team_count = (p_payload ->> 'team_count')::integer,
    is_online = (p_payload ->> 'is_online')::boolean,
    location_name = nullif(btrim(p_payload ->> 'location_name'), ''),
    status = p_payload ->> 'status',
    is_public = (p_payload ->> 'is_public')::boolean
  where id = v_old.id returning * into v_stage;

  select coalesce(jsonb_agg(key order by key), '[]'::jsonb) into v_changed
  from jsonb_each(p_payload)
  where to_jsonb(v_old) -> key is distinct from value;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'stage_updated', null, null,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_stage.id, 'changed_fields', v_changed,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return jsonb_build_object(
    'id', v_stage.id, 'submission_id', v_stage.submission_id,
    'name', v_stage.name, 'slug', v_stage.slug,
    'updated_at', v_stage.updated_at
  );
exception when unique_violation then
  raise exception using errcode = '23505', message = 'stage_sequence_conflict';
end;
$$;

create or replace function public.delete_tournament_stage(
  p_submission_id uuid,
  p_stage_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_stage public.tournament_stages;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  select * into v_stage from public.tournament_stages
  where id = p_stage_id and submission_id = p_submission_id
    and updated_at = p_expected_updated_at
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'operational_conflict';
  end if;
  if exists (select 1 from public.tournament_matches where stage_id = v_stage.id) then
    raise exception using errcode = '23503', message = 'stage_has_dependencies';
  end if;
  delete from public.tournament_stages where id = v_stage.id;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'stage_deleted', null, null,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_stage.id, 'entity_name', v_stage.name,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return jsonb_build_object(
    'id', v_stage.id, 'submission_id', p_submission_id,
    'name', v_stage.name, 'deleted', true
  );
end;
$$;

create or replace function public.create_tournament_team(
  p_submission_id uuid,
  p_payload jsonb,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_team public.tournament_teams;
  v_slug text;
  v_base text;
  v_suffix integer := 2;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array[
      'name','short_name','slug','logo_url','region','seed','status',
      'external_team_id','source','is_public'
    ]::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'team_input_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text, 12));
  if exists (
    select 1 from public.tournament_teams
    where submission_id = p_submission_id
      and lower(name) = lower(btrim(p_payload ->> 'name'))
  ) then
    raise exception using errcode = '23505', message = 'team_name_conflict';
  end if;
  v_base := p_payload ->> 'slug';
  v_slug := v_base;
  while exists (
    select 1 from public.tournament_teams
    where submission_id = p_submission_id and slug = v_slug
  ) loop
    v_slug := left(v_base, 100 - char_length(v_suffix::text) - 1)
      || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;
  insert into public.tournament_teams (
    submission_id, name, short_name, slug, logo_url, region, seed, status,
    external_team_id, source, is_public
  ) values (
    p_submission_id, btrim(p_payload ->> 'name'),
    nullif(btrim(p_payload ->> 'short_name'), ''), v_slug,
    nullif(btrim(p_payload ->> 'logo_url'), ''),
    nullif(btrim(p_payload ->> 'region'), ''),
    (p_payload ->> 'seed')::integer, p_payload ->> 'status',
    nullif(btrim(p_payload ->> 'external_team_id'), ''),
    'manual', (p_payload ->> 'is_public')::boolean
  ) returning * into v_team;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'team_created', null, null,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_team.id, 'entity_name', v_team.name,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return jsonb_build_object(
    'id', v_team.id, 'submission_id', v_team.submission_id,
    'name', v_team.name, 'slug', v_team.slug,
    'updated_at', v_team.updated_at
  );
end;
$$;

create or replace function public.update_tournament_team(
  p_submission_id uuid,
  p_team_id uuid,
  p_expected_updated_at timestamptz,
  p_payload jsonb,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_old public.tournament_teams;
  v_team public.tournament_teams;
  v_changed jsonb;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array[
      'name','short_name','logo_url','region','seed','status',
      'external_team_id','is_public'
    ]::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'team_input_invalid';
  end if;
  select * into v_old from public.tournament_teams
  where id = p_team_id and submission_id = p_submission_id
    and updated_at = p_expected_updated_at
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'operational_conflict';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text, 12));
  if exists (
    select 1 from public.tournament_teams
    where submission_id = p_submission_id and id <> p_team_id
      and lower(name) = lower(btrim(p_payload ->> 'name'))
  ) then
    raise exception using errcode = '23505', message = 'team_name_conflict';
  end if;
  update public.tournament_teams set
    name = btrim(p_payload ->> 'name'),
    short_name = nullif(btrim(p_payload ->> 'short_name'), ''),
    logo_url = nullif(btrim(p_payload ->> 'logo_url'), ''),
    region = nullif(btrim(p_payload ->> 'region'), ''),
    seed = (p_payload ->> 'seed')::integer,
    status = p_payload ->> 'status',
    external_team_id = nullif(btrim(p_payload ->> 'external_team_id'), ''),
    is_public = (p_payload ->> 'is_public')::boolean
  where id = v_old.id returning * into v_team;
  select coalesce(jsonb_agg(key order by key), '[]'::jsonb) into v_changed
  from jsonb_each(p_payload)
  where to_jsonb(v_old) -> key is distinct from value;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'team_updated', null, null,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_team.id, 'changed_fields', v_changed,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return jsonb_build_object(
    'id', v_team.id, 'submission_id', v_team.submission_id,
    'name', v_team.name, 'slug', v_team.slug,
    'updated_at', v_team.updated_at
  );
end;
$$;

create or replace function public.delete_tournament_team(
  p_submission_id uuid,
  p_team_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_team public.tournament_teams;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  select * into v_team from public.tournament_teams
  where id = p_team_id and submission_id = p_submission_id
    and updated_at = p_expected_updated_at
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'operational_conflict';
  end if;
  if exists (
    select 1 from public.tournament_roster_members
    where tournament_team_id = v_team.id
  ) or exists (
    select 1 from public.tournament_matches
    where team_a_id = v_team.id or team_b_id = v_team.id
      or winner_team_id = v_team.id
  ) then
    raise exception using errcode = '23503', message = 'team_has_dependencies';
  end if;
  delete from public.tournament_teams where id = v_team.id;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'team_deleted', null, null,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_team.id, 'entity_name', v_team.name,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return jsonb_build_object(
    'id', v_team.id, 'submission_id', p_submission_id,
    'name', v_team.name, 'deleted', true
  );
end;
$$;

revoke all on function public.create_organizer_workspace_token(uuid, text, text, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_organizer_workspace_token(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.validate_organizer_workspace_access(text)
  from public, anon, authenticated;
revoke all on function public.assert_operational_mutation_access(uuid, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.operational_actor_metadata(text)
  from public, anon, authenticated;
revoke all on function public.create_tournament_stage(uuid, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.update_tournament_stage(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.delete_tournament_stage(uuid, uuid, timestamptz, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.create_tournament_team(uuid, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.update_tournament_team(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.delete_tournament_team(uuid, uuid, timestamptz, text, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.create_organizer_workspace_token(uuid, text, text, timestamptz, uuid)
  to service_role;
grant execute on function public.revoke_organizer_workspace_token(uuid, uuid)
  to service_role;
grant execute on function public.validate_organizer_workspace_access(text)
  to service_role;
grant execute on function public.create_tournament_stage(uuid, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.update_tournament_stage(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.delete_tournament_stage(uuid, uuid, timestamptz, text, uuid, uuid)
  to service_role;
grant execute on function public.create_tournament_team(uuid, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.update_tournament_team(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.delete_tournament_team(uuid, uuid, timestamptz, text, uuid, uuid)
  to service_role;
