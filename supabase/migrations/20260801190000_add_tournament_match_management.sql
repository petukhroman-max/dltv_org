-- Match management extends the existing tournament_matches table.
-- No public or authenticated role receives direct table/RPC access.

alter table public.tournament_matches
  add constraint tournament_matches_draft_result_empty check (
    status <> 'draft'
    or (score_a is null and score_b is null and winner_team_id is null)
  ),
  add constraint tournament_matches_scheduled_required_fields check (
    status <> 'scheduled'
    or (stage_id is not null and scheduled_at is not null and best_of is not null)
  ),
  add constraint tournament_matches_postponed_result_empty check (
    status <> 'postponed'
    or (score_a is null and score_b is null and winner_team_id is null)
  ),
  add constraint tournament_matches_cancelled_result_empty check (
    status <> 'cancelled'
    or (score_a is null and score_b is null and winner_team_id is null)
  ),
  add constraint tournament_matches_live_stage_required check (
    status <> 'live' or stage_id is not null
  );

create unique index tournament_matches_submission_deadlock_match_id_key
  on public.tournament_matches(submission_id, deadlock_match_id)
  where deadlock_match_id is not null;

create or replace function public.match_transition_allowed(
  p_current text,
  p_target text,
  p_explicit_reopen boolean default false
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when p_current = 'draft' and p_target in ('scheduled', 'cancelled') then true
    when p_current = 'scheduled' and p_target in (
      'live', 'postponed', 'cancelled', 'completed', 'walkover'
    ) then true
    when p_current = 'postponed' and p_target in ('scheduled', 'cancelled') then true
    when p_current = 'live' and p_target in ('completed', 'cancelled', 'walkover') then true
    when p_explicit_reopen and p_current = 'completed' and p_target = 'live' then true
    when p_explicit_reopen and p_current = 'cancelled'
      and p_target in ('draft', 'scheduled') then true
    when p_explicit_reopen and p_current = 'walkover' and p_target = 'scheduled' then true
    else false
  end;
$$;

create or replace function public.lock_tournament_match(
  p_submission_id uuid,
  p_match_id uuid,
  p_expected_updated_at timestamptz
)
returns public.tournament_matches
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_match public.tournament_matches;
begin
  select * into v_match
  from public.tournament_matches
  where id = p_match_id
    and submission_id = p_submission_id
    and updated_at = p_expected_updated_at
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'match_stale_update';
  end if;
  return v_match;
end;
$$;

create or replace function public.match_result_json(v_match public.tournament_matches)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', v_match.id,
    'submission_id', v_match.submission_id,
    'status', v_match.status,
    'updated_at', v_match.updated_at
  );
$$;

create or replace function public.create_tournament_match(
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
declare v_match public.tournament_matches;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array[
      'stage_id','match_number','round_name','group_name','scheduled_at',
      'best_of','team_a_id','team_b_id','stream_url','is_public','status'
    ]::text[] <> '{}'::jsonb
    or coalesce(p_payload ->> 'status', '') not in ('draft', 'scheduled')
  then
    raise exception using errcode = '22023', message = 'match_input_invalid';
  end if;

  insert into public.tournament_matches (
    submission_id, stage_id, match_number, round_name, group_name,
    scheduled_at, best_of, team_a_id, team_b_id, stream_url,
    status, source, is_public
  ) values (
    p_submission_id,
    (p_payload ->> 'stage_id')::uuid,
    (p_payload ->> 'match_number')::integer,
    nullif(btrim(p_payload ->> 'round_name'), ''),
    nullif(btrim(p_payload ->> 'group_name'), ''),
    (p_payload ->> 'scheduled_at')::timestamptz,
    (p_payload ->> 'best_of')::integer,
    (p_payload ->> 'team_a_id')::uuid,
    (p_payload ->> 'team_b_id')::uuid,
    nullif(btrim(p_payload ->> 'stream_url'), ''),
    p_payload ->> 'status',
    'manual',
    coalesce((p_payload ->> 'is_public')::boolean, true)
  ) returning * into v_match;

  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'match_created', null, v_match.status,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_match.id,
      'match_number', v_match.match_number,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return public.match_result_json(v_match);
exception when unique_violation then
  if sqlerrm like '%deadlock_match_id%' then
    raise exception using errcode = '23505', message = 'match_deadlock_id_conflict';
  end if;
  raise exception using errcode = '23505', message = 'match_number_conflict';
end;
$$;

create or replace function public.update_tournament_match(
  p_submission_id uuid,
  p_match_id uuid,
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
  v_old public.tournament_matches;
  v_match public.tournament_matches;
  v_changed jsonb;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array[
      'stage_id','match_number','round_name','group_name','scheduled_at',
      'best_of','team_a_id','team_b_id','stream_url','vod_url',
      'deadlock_match_id','duration_seconds','is_public'
    ]::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'match_input_invalid';
  end if;
  v_old := public.lock_tournament_match(
    p_submission_id, p_match_id, p_expected_updated_at
  );

  update public.tournament_matches set
    stage_id = (p_payload ->> 'stage_id')::uuid,
    match_number = (p_payload ->> 'match_number')::integer,
    round_name = nullif(btrim(p_payload ->> 'round_name'), ''),
    group_name = nullif(btrim(p_payload ->> 'group_name'), ''),
    scheduled_at = (p_payload ->> 'scheduled_at')::timestamptz,
    best_of = (p_payload ->> 'best_of')::integer,
    team_a_id = (p_payload ->> 'team_a_id')::uuid,
    team_b_id = (p_payload ->> 'team_b_id')::uuid,
    stream_url = nullif(btrim(p_payload ->> 'stream_url'), ''),
    vod_url = nullif(btrim(p_payload ->> 'vod_url'), ''),
    deadlock_match_id = nullif(btrim(p_payload ->> 'deadlock_match_id'), ''),
    duration_seconds = (p_payload ->> 'duration_seconds')::integer,
    is_public = coalesce((p_payload ->> 'is_public')::boolean, false)
  where id = v_old.id returning * into v_match;

  select coalesce(jsonb_agg(key order by key), '[]'::jsonb) into v_changed
  from jsonb_each(p_payload)
  where to_jsonb(v_old) -> key is distinct from value;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'match_updated', v_old.status, v_match.status,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_match.id,
      'changed_fields', v_changed,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return public.match_result_json(v_match);
exception when unique_violation then
  if sqlerrm like '%deadlock_match_id%' then
    raise exception using errcode = '23505', message = 'match_deadlock_id_conflict';
  end if;
  raise exception using errcode = '23505', message = 'match_number_conflict';
end;
$$;

create or replace function public.update_tournament_match_status(
  p_submission_id uuid,
  p_match_id uuid,
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
  v_old public.tournament_matches;
  v_match public.tournament_matches;
  v_target text;
  v_winner uuid;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array['target_status','winner_team_id']::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'match_input_invalid';
  end if;
  v_old := public.lock_tournament_match(
    p_submission_id, p_match_id, p_expected_updated_at
  );
  v_target := p_payload ->> 'target_status';
  if not public.match_transition_allowed(v_old.status, v_target, false)
    or v_target not in ('scheduled', 'live', 'postponed', 'walkover')
  then
    raise exception using errcode = '22023', message = 'match_transition_invalid';
  end if;
  v_winner := (p_payload ->> 'winner_team_id')::uuid;
  if v_target = 'walkover' and (
    v_winner is null
    or v_winner is distinct from v_old.team_a_id
      and v_winner is distinct from v_old.team_b_id
  ) then
    raise exception using errcode = '22023', message = 'match_winner_invalid';
  end if;

  update public.tournament_matches set
    status = v_target,
    score_a = null,
    score_b = null,
    winner_team_id = case when v_target = 'walkover' then v_winner else null end,
    duration_seconds = case when v_target = 'walkover' then null else duration_seconds end
  where id = v_old.id returning * into v_match;

  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id,
    case when v_target = 'walkover' then 'match_walkover_recorded'
      else 'match_status_changed' end,
    v_old.status, v_match.status,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object('entity_id', v_match.id, 'operational_version', 'v1')
      || public.operational_actor_metadata(p_actor_type)
  );
  return public.match_result_json(v_match);
end;
$$;

create or replace function public.complete_tournament_match(
  p_submission_id uuid,
  p_match_id uuid,
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
  v_old public.tournament_matches;
  v_match public.tournament_matches;
  v_score_a integer;
  v_score_b integer;
  v_winner uuid;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array[
      'score_a','score_b','deadlock_match_id','duration_seconds','vod_url'
    ]::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'match_input_invalid';
  end if;
  v_old := public.lock_tournament_match(
    p_submission_id, p_match_id, p_expected_updated_at
  );
  if not public.match_transition_allowed(v_old.status, 'completed', false)
    or v_old.team_a_id is null or v_old.team_b_id is null
  then
    raise exception using errcode = '22023', message = 'match_transition_invalid';
  end if;
  v_score_a := (p_payload ->> 'score_a')::integer;
  v_score_b := (p_payload ->> 'score_b')::integer;
  if v_score_a is null or v_score_b is null or v_score_a < 0
    or v_score_b < 0 or v_score_a = v_score_b
  then
    raise exception using errcode = '22023', message = 'match_score_invalid';
  end if;
  v_winner := case when v_score_a > v_score_b
    then v_old.team_a_id else v_old.team_b_id end;

  update public.tournament_matches set
    status = 'completed',
    score_a = v_score_a,
    score_b = v_score_b,
    winner_team_id = v_winner,
    deadlock_match_id = nullif(btrim(p_payload ->> 'deadlock_match_id'), ''),
    duration_seconds = (p_payload ->> 'duration_seconds')::integer,
    vod_url = nullif(btrim(p_payload ->> 'vod_url'), '')
  where id = v_old.id returning * into v_match;

  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'match_completed', v_old.status, 'completed',
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_match.id,
      'score_a', v_match.score_a,
      'score_b', v_match.score_b,
      'winner_team_id', v_match.winner_team_id,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return public.match_result_json(v_match);
exception when unique_violation then
  raise exception using errcode = '23505', message = 'match_deadlock_id_conflict';
end;
$$;

create or replace function public.cancel_tournament_match(
  p_submission_id uuid,
  p_match_id uuid,
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
declare
  v_old public.tournament_matches;
  v_match public.tournament_matches;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  v_old := public.lock_tournament_match(
    p_submission_id, p_match_id, p_expected_updated_at
  );
  if not public.match_transition_allowed(v_old.status, 'cancelled', false) then
    raise exception using errcode = '22023', message = 'match_transition_invalid';
  end if;
  update public.tournament_matches set
    status = 'cancelled', score_a = null, score_b = null, winner_team_id = null
  where id = v_old.id returning * into v_match;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'match_cancelled', v_old.status, 'cancelled',
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object('entity_id', v_match.id, 'operational_version', 'v1')
      || public.operational_actor_metadata(p_actor_type)
  );
  return public.match_result_json(v_match);
end;
$$;

create or replace function public.reopen_tournament_match(
  p_submission_id uuid,
  p_match_id uuid,
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
  v_old public.tournament_matches;
  v_match public.tournament_matches;
  v_target text;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array['target_status']::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'match_input_invalid';
  end if;
  v_old := public.lock_tournament_match(
    p_submission_id, p_match_id, p_expected_updated_at
  );
  v_target := p_payload ->> 'target_status';
  if not public.match_transition_allowed(v_old.status, v_target, true) then
    raise exception using errcode = '22023', message = 'match_transition_invalid';
  end if;
  update public.tournament_matches set
    status = v_target,
    score_a = null,
    score_b = null,
    winner_team_id = null,
    duration_seconds = null
  where id = v_old.id returning * into v_match;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'match_reopened', v_old.status, v_match.status,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object('entity_id', v_match.id, 'operational_version', 'v1')
      || public.operational_actor_metadata(p_actor_type)
  );
  return public.match_result_json(v_match);
end;
$$;

create or replace function public.delete_tournament_match(
  p_submission_id uuid,
  p_match_id uuid,
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
declare v_match public.tournament_matches;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  v_match := public.lock_tournament_match(
    p_submission_id, p_match_id, p_expected_updated_at
  );
  if not (
    v_match.status = 'draft'
    or (
      v_match.status = 'scheduled'
      and v_match.score_a is null
      and v_match.score_b is null
      and v_match.winner_team_id is null
      and v_match.deadlock_match_id is null
      and v_match.vod_url is null
    )
  ) then
    raise exception using errcode = '23503', message = 'match_delete_has_history';
  end if;
  delete from public.tournament_matches where id = v_match.id;
  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    p_submission_id, 'match_deleted', v_match.status, null,
    case when p_actor_type = 'admin' then 'admin' else 'organizer' end,
    case when p_actor_type = 'admin' then p_actor_id else null end,
    jsonb_build_object(
      'entity_id', v_match.id,
      'match_number', v_match.match_number,
      'operational_version', 'v1'
    ) || public.operational_actor_metadata(p_actor_type)
  );
  return jsonb_build_object(
    'id', v_match.id,
    'submission_id', v_match.submission_id,
    'deleted', true
  );
end;
$$;

revoke all on function public.match_transition_allowed(text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.lock_tournament_match(uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.match_result_json(public.tournament_matches)
  from public, anon, authenticated;
revoke all on function public.create_tournament_match(uuid, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.update_tournament_match(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.update_tournament_match_status(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_tournament_match(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.cancel_tournament_match(uuid, uuid, timestamptz, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.reopen_tournament_match(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.delete_tournament_match(uuid, uuid, timestamptz, text, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.create_tournament_match(uuid, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.update_tournament_match(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.update_tournament_match_status(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.complete_tournament_match(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.cancel_tournament_match(uuid, uuid, timestamptz, text, uuid, uuid)
  to service_role;
grant execute on function public.reopen_tournament_match(uuid, uuid, timestamptz, jsonb, text, uuid, uuid)
  to service_role;
grant execute on function public.delete_tournament_match(uuid, uuid, timestamptz, text, uuid, uuid)
  to service_role;
