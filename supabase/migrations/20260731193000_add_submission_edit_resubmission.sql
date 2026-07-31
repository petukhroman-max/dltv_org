create table public.submission_edit_tokens (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null
    references public.tournament_submissions(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  revoked_at timestamptz null,
  created_by uuid not null references public.admin_users(user_id),
  created_at timestamptz not null default now(),
  constraint submission_edit_tokens_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint submission_edit_tokens_expiration_order
    check (expires_at > created_at),
  constraint submission_edit_tokens_used_order
    check (used_at is null or used_at >= created_at),
  constraint submission_edit_tokens_revoked_order
    check (revoked_at is null or revoked_at >= created_at)
);

create index submission_edit_tokens_submission_created_idx
  on public.submission_edit_tokens(submission_id, created_at desc);

-- PostgreSQL partial-index predicates cannot use volatile time expressions.
-- Creation revokes every unresolved token before insert; this stronger invariant
-- also prevents concurrent transactions from leaving two usable links.
create unique index submission_edit_tokens_one_unresolved_idx
  on public.submission_edit_tokens(submission_id)
  where used_at is null and revoked_at is null;

alter table public.submission_edit_tokens enable row level security;
revoke all on table public.submission_edit_tokens from public, anon, authenticated;
grant all on table public.submission_edit_tokens to service_role;

create or replace function public.create_submission_edit_token(
  p_submission_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_token public.submission_edit_tokens;
begin
  if p_created_by is null or not exists (
    select 1 from public.admin_users where user_id = p_created_by
  ) then
    raise exception using errcode = '42501', message = 'edit_link_not_authorized';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now() then
    raise exception using errcode = '22023', message = 'edit_link_input_invalid';
  end if;

  perform 1
  from public.tournament_submissions
  where id = p_submission_id and status = 'needs_changes'
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'edit_link_submission_invalid';
  end if;

  update public.submission_edit_tokens
  set revoked_at = now()
  where submission_id = p_submission_id
    and used_at is null
    and revoked_at is null;

  insert into public.submission_edit_tokens (
    submission_id, token_hash, expires_at, created_by
  ) values (
    p_submission_id, p_token_hash, p_expires_at, p_created_by
  ) returning * into v_token;

  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'edit_link_created', 'needs_changes', 'needs_changes',
    'admin', p_created_by,
    jsonb_build_object(
      'expires_at', p_expires_at,
      'delivery_method', 'manual',
      'token_version', 'v1'
    )
  );

  return jsonb_build_object(
    'id', v_token.id,
    'submission_id', v_token.submission_id,
    'expires_at', v_token.expires_at,
    'created_at', v_token.created_at
  );
end;
$$;

create or replace function public.revoke_submission_edit_tokens(
  p_submission_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_revoked_count integer;
begin
  if p_reviewer_id is null or not exists (
    select 1 from public.admin_users where user_id = p_reviewer_id
  ) then
    raise exception using errcode = '42501', message = 'edit_link_not_authorized';
  end if;

  perform 1
  from public.tournament_submissions
  where id = p_submission_id and status = 'needs_changes'
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'edit_link_submission_invalid';
  end if;

  update public.submission_edit_tokens
  set revoked_at = now()
  where submission_id = p_submission_id
    and used_at is null
    and revoked_at is null
    and expires_at > now();
  get diagnostics v_revoked_count = row_count;

  if v_revoked_count > 0 then
    insert into public.submission_events (
      submission_id, event_type, from_status, to_status,
      actor_type, actor_id, metadata
    ) values (
      p_submission_id, 'edit_link_revoked', 'needs_changes', 'needs_changes',
      'admin', p_reviewer_id,
      jsonb_build_object('source', 'admin_portal', 'version', 'v1')
    );
  end if;

  return jsonb_build_object('submission_id', p_submission_id, 'revoked_count', v_revoked_count);
end;
$$;

create or replace function public.resubmit_tournament_submission(
  p_token_hash text,
  p_submission jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_token public.submission_edit_tokens;
  v_updated public.tournament_submissions;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_submission) is distinct from 'object'
    or p_submission - array[
      'tournament_name', 'description', 'region', 'language',
      'start_date', 'end_date', 'timezone', 'format', 'prize_pool_text',
      'registration_url', 'bracket_url', 'discord_url', 'stream_url',
      'rules_url', 'is_online', 'max_teams', 'registration_deadline',
      'organizer_notes'
    ]::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'edit_link_invalid';
  end if;

  select * into v_token
  from public.submission_edit_tokens
  where token_hash = p_token_hash
  for update;

  if not found
    or v_token.used_at is not null
    or v_token.revoked_at is not null
    or v_token.expires_at <= now()
  then
    raise exception using errcode = '22023', message = 'edit_link_invalid';
  end if;

  update public.tournament_submissions
  set
    tournament_name = btrim(p_submission ->> 'tournament_name'),
    description = nullif(btrim(p_submission ->> 'description'), ''),
    region = btrim(p_submission ->> 'region'),
    language = nullif(btrim(p_submission ->> 'language'), ''),
    start_date = (p_submission ->> 'start_date')::date,
    end_date = (p_submission ->> 'end_date')::date,
    timezone = btrim(p_submission ->> 'timezone'),
    format = nullif(btrim(p_submission ->> 'format'), ''),
    prize_pool_text = nullif(btrim(p_submission ->> 'prize_pool_text'), ''),
    registration_url = nullif(btrim(p_submission ->> 'registration_url'), ''),
    bracket_url = nullif(btrim(p_submission ->> 'bracket_url'), ''),
    discord_url = nullif(btrim(p_submission ->> 'discord_url'), ''),
    stream_url = nullif(btrim(p_submission ->> 'stream_url'), ''),
    rules_url = nullif(btrim(p_submission ->> 'rules_url'), ''),
    is_online = (p_submission ->> 'is_online')::boolean,
    max_teams = (p_submission ->> 'max_teams')::integer,
    registration_deadline = (p_submission ->> 'registration_deadline')::timestamptz,
    organizer_notes = nullif(btrim(p_submission ->> 'organizer_notes'), ''),
    status = 'submitted',
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    published_at = null
  where id = v_token.submission_id and status = 'needs_changes'
  returning * into v_updated;

  if not found then
    raise exception using errcode = '22023', message = 'edit_link_invalid';
  end if;

  update public.submission_edit_tokens
  set used_at = now()
  where id = v_token.id;

  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    v_updated.id, 'submission_resubmitted', 'needs_changes', 'submitted',
    'organizer', null,
    jsonb_build_object('edit_method', 'secure_link', 'edit_version', 'v1')
  );

  return jsonb_build_object(
    'submission_id', v_updated.id,
    'status', v_updated.status,
    'submitted_at', v_updated.submitted_at
  );
end;
$$;

revoke all on function public.create_submission_edit_token(uuid, text, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_submission_edit_tokens(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.resubmit_tournament_submission(text, jsonb)
  from public, anon, authenticated;

grant execute on function public.create_submission_edit_token(uuid, text, timestamptz, uuid)
  to service_role;
grant execute on function public.revoke_submission_edit_tokens(uuid, uuid)
  to service_role;
grant execute on function public.resubmit_tournament_submission(text, jsonb)
  to service_role;
