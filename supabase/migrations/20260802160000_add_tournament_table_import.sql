-- Safe, preview-first tournament table import sessions.
-- Raw workbooks and workspace tokens are never stored in these tables.

create table public.tournament_import_sessions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.tournament_submissions(id) on delete cascade,
  source_type text not null,
  source_filename text not null,
  source_url_safe text null,
  source_fingerprint text not null,
  template_type text not null,
  status text not null default 'uploaded',
  detected_sheets jsonb not null default '[]'::jsonb,
  mapping_config jsonb not null default '{}'::jsonb,
  validation_summary jsonb not null default '{}'::jsonb,
  import_summary jsonb not null default '{}'::jsonb,
  created_by_actor_type text not null,
  created_by_actor_id uuid null,
  created_by_workspace_token_id uuid null references public.organizer_workspace_tokens(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  applied_at timestamptz null,
  constraint tournament_import_source_type_allowed check (source_type in ('xlsx','google_sheets')),
  constraint tournament_import_template_type_allowed check (template_type in ('guildlock_v1','custom_mapping','unknown')),
  constraint tournament_import_status_allowed check (status in (
    'uploaded','parsed','mapping_required','validation_failed','ready','applying',
    'completed','failed','cancelled','expired'
  )),
  constraint tournament_import_actor_type_allowed check (created_by_actor_type in ('admin','organizer_workspace')),
  constraint tournament_import_actor_shape check (
    (created_by_actor_type='admin' and created_by_actor_id is not null and created_by_workspace_token_id is null)
    or (created_by_actor_type='organizer_workspace' and created_by_actor_id is null and created_by_workspace_token_id is not null)
  ),
  constraint tournament_import_filename_safe check (btrim(source_filename)<>'' and char_length(source_filename)<=255),
  constraint tournament_import_fingerprint_format check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint tournament_import_url_safe check (
    source_url_safe is null or source_url_safe ~ '^https://docs\.google\.com/spreadsheets/d/[A-Za-z0-9_-]{20,128}$'
  ),
  constraint tournament_import_expiration_order check (expires_at>created_at),
  constraint tournament_import_applied_state check ((applied_at is null)=(status<>'completed'))
);

create table public.tournament_import_rows (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tournament_import_sessions(id) on delete cascade,
  entity_type text not null,
  source_sheet text not null,
  source_row_number integer not null,
  source_key text not null,
  normalized_payload jsonb not null,
  validation_status text not null,
  validation_errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  proposed_action text not null,
  existing_entity_id uuid null,
  resolution jsonb null,
  created_at timestamptz not null default now(),
  constraint tournament_import_rows_entity_type_allowed check (entity_type in (
    'stage','team','player','roster_member','match','bracket_link','standings_group_assignment'
  )),
  constraint tournament_import_rows_validation_allowed check (validation_status in ('valid','warning','invalid','conflict')),
  constraint tournament_import_rows_action_allowed check (proposed_action in ('create','update','skip','conflict','invalid')),
  constraint tournament_import_rows_sheet_safe check (btrim(source_sheet)<>'' and char_length(source_sheet)<=100),
  constraint tournament_import_rows_source_row_positive check (source_row_number>0),
  constraint tournament_import_rows_source_key_safe check (btrim(source_key)<>'' and char_length(source_key)<=200),
  constraint tournament_import_rows_payload_object check (jsonb_typeof(normalized_payload)='object'),
  constraint tournament_import_rows_errors_array check (jsonb_typeof(validation_errors)='array'),
  constraint tournament_import_rows_warnings_array check (jsonb_typeof(warnings)='array')
);

create index tournament_import_sessions_submission_created_idx
  on public.tournament_import_sessions(submission_id,created_at desc);
create index tournament_import_sessions_fingerprint_idx
  on public.tournament_import_sessions(submission_id,source_fingerprint,status);
create index tournament_import_sessions_expiry_idx
  on public.tournament_import_sessions(expires_at) where status not in ('completed','cancelled','expired');
create index tournament_import_rows_session_action_idx
  on public.tournament_import_rows(session_id,proposed_action,entity_type);
create index tournament_import_rows_session_key_idx
  on public.tournament_import_rows(session_id,entity_type,source_key);

create trigger tournament_import_sessions_set_updated_at before update
on public.tournament_import_sessions for each row execute function public.set_updated_at();

alter table public.tournament_import_sessions enable row level security;
alter table public.tournament_import_rows enable row level security;
revoke all on public.tournament_import_sessions,public.tournament_import_rows from public,anon,authenticated;
grant select,insert,update,delete on public.tournament_import_sessions,public.tournament_import_rows to service_role;

create or replace function public.expire_tournament_import_sessions()
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_count integer;
begin
  update public.tournament_import_sessions set status='expired'
  where expires_at<=now() and status not in ('completed','cancelled','expired','applying');
  get diagnostics v_count=row_count;
  delete from public.tournament_import_rows where session_id in (
    select id from public.tournament_import_sessions where status='expired' and expires_at<=now()
  );
  return v_count;
end; $$;
revoke all on function public.expire_tournament_import_sessions() from public,anon,authenticated;
grant execute on function public.expire_tournament_import_sessions() to service_role;

create or replace function public.apply_tournament_import_session(
  p_session_id uuid,
  p_submission_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.tournament_import_sessions;
  v_row public.tournament_import_rows;
  v_stage_ids jsonb := '{}'::jsonb;
  v_team_ids jsonb := '{}'::jsonb;
  v_player_ids jsonb := '{}'::jsonb;
  v_match_ids jsonb := '{}'::jsonb;
  v_entity_id uuid;
  v_stage_id uuid;
  v_team_id uuid;
  v_player_id uuid;
  v_team_a_id uuid;
  v_team_b_id uuid;
  v_winner_id uuid;
  v_source_id uuid;
  v_target_id uuid;
  v_slug text;
  v_action text;
  v_decision text;
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_conflicts_resolved integer := 0;
  v_started_at timestamptz := clock_timestamp();
  v_summary jsonb;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id
  );

  select * into v_session from public.tournament_import_sessions
  where id=p_session_id and submission_id=p_submission_id for update;
  if not found then raise exception using errcode='P0002',message='import_session_not_found'; end if;
  if v_session.status='completed' then raise exception using errcode='22023',message='import_session_already_completed'; end if;
  if v_session.status<>'ready' then raise exception using errcode='22023',message='import_session_not_ready'; end if;
  if v_session.expires_at<=now() then
    update public.tournament_import_sessions set status='expired' where id=p_session_id;
    raise exception using errcode='22023',message='import_session_expired';
  end if;
  if (p_actor_type='admin' and (v_session.created_by_actor_type<>'admin' or v_session.created_by_actor_id<>p_actor_id))
    or (p_actor_type='organizer_workspace' and (
      v_session.created_by_actor_type<>'organizer_workspace'
      or v_session.created_by_workspace_token_id<>p_workspace_token_id
    )) then
    raise exception using errcode='42501',message='import_session_actor_mismatch';
  end if;
  if exists (
    select 1 from public.tournament_import_rows
    where session_id=p_session_id and (
      proposed_action='invalid'
      or (proposed_action='conflict' and resolution is null)
    )
  ) then raise exception using errcode='22023',message='import_blocking_rows_unresolved'; end if;

  update public.tournament_import_sessions set status='applying' where id=p_session_id;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'import_started',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('session_id',p_session_id,'source_type',v_session.source_type,
      'template_type',v_session.template_type,'fingerprint_prefix',left(v_session.source_fingerprint,12),'operational_version','v1')
      ||public.operational_actor_metadata(p_actor_type));

  for v_row in
    select * from public.tournament_import_rows where session_id=p_session_id
    order by case entity_type when 'stage' then 1 when 'team' then 2 when 'player' then 3
      when 'roster_member' then 4 when 'match' then 5 when 'standings_group_assignment' then 6
      when 'bracket_link' then 8 else 9 end,source_sheet,source_row_number,id
  loop
    v_action := v_row.proposed_action;
    v_decision := v_row.resolution->>'decision';
    if v_action='conflict' then
      v_conflicts_resolved := v_conflicts_resolved+1;
      if v_decision in ('keep_existing','skip') then v_action:='skip';
      elsif v_decision='link_existing' then
        v_action:='update';
        v_row.existing_entity_id := (v_row.resolution->>'existingEntityId')::uuid;
      elsif v_decision='create_new' then v_action:='create';
      elsif v_decision='use_spreadsheet' then v_action:='update';
      else raise exception using errcode='22023',message='import_resolution_invalid'; end if;
    end if;
    if v_action='skip' then
      if v_row.existing_entity_id is not null then
        if v_row.entity_type='stage' then v_stage_ids:=v_stage_ids||jsonb_build_object(v_row.source_key,v_row.existing_entity_id);
        elsif v_row.entity_type='team' then v_team_ids:=v_team_ids||jsonb_build_object(v_row.source_key,v_row.existing_entity_id);
        elsif v_row.entity_type='player' then v_player_ids:=v_player_ids||jsonb_build_object(v_row.source_key,v_row.existing_entity_id);
        elsif v_row.entity_type='match' then v_match_ids:=v_match_ids||jsonb_build_object(v_row.source_key,v_row.existing_entity_id);
        end if;
      end if;
      v_skipped:=v_skipped+1; continue;
    end if;

    if v_row.entity_type='stage' then
      v_entity_id:=v_row.existing_entity_id;
      v_slug:=coalesce(nullif(trim(both '-' from regexp_replace(lower(v_row.normalized_payload->>'name'),'[^a-z0-9]+','-','g')),''),'imported')
        ||'-'||left(encode(digest(v_row.source_key,'sha256'),'hex'),8);
      if v_action='create' then
        insert into public.tournament_stages(submission_id,name,slug,stage_type,sequence_number,timezone,best_of_default,status)
        values(p_submission_id,v_row.normalized_payload->>'name',v_slug,v_row.normalized_payload->>'stageType',
          (v_row.normalized_payload->>'sequenceNumber')::integer,nullif(v_row.normalized_payload->>'timezone',''),
          (v_row.normalized_payload->>'bestOfDefault')::integer,'scheduled') returning id into v_entity_id;
        v_created:=v_created+1;
      else
        update public.tournament_stages set name=v_row.normalized_payload->>'name',stage_type=v_row.normalized_payload->>'stageType',
          sequence_number=(v_row.normalized_payload->>'sequenceNumber')::integer,timezone=nullif(v_row.normalized_payload->>'timezone',''),
          best_of_default=(v_row.normalized_payload->>'bestOfDefault')::integer
        where id=v_entity_id and submission_id=p_submission_id returning id into v_entity_id;
        if not found then raise exception using errcode='42501',message='import_cross_submission_reference'; end if;
        v_updated:=v_updated+1;
      end if;
      v_stage_ids:=v_stage_ids||jsonb_build_object(v_row.source_key,v_entity_id);

    elsif v_row.entity_type='team' then
      v_entity_id:=v_row.existing_entity_id;
      v_slug:=coalesce(nullif(trim(both '-' from regexp_replace(lower(v_row.normalized_payload->>'name'),'[^a-z0-9]+','-','g')),''),'imported')
        ||'-'||left(encode(digest(v_row.source_key,'sha256'),'hex'),8);
      if v_action='create' then
        insert into public.tournament_teams(submission_id,name,short_name,slug,region,seed,external_team_id,source,status)
        values(p_submission_id,v_row.normalized_payload->>'name',nullif(v_row.normalized_payload->>'shortName',''),v_slug,
          nullif(v_row.normalized_payload->>'region',''),(v_row.normalized_payload->>'seed')::integer,
          nullif(v_row.normalized_payload->>'externalTeamId',''),'import','active') returning id into v_entity_id;
        v_created:=v_created+1;
      else
        update public.tournament_teams set name=v_row.normalized_payload->>'name',short_name=nullif(v_row.normalized_payload->>'shortName',''),
          region=nullif(v_row.normalized_payload->>'region',''),seed=(v_row.normalized_payload->>'seed')::integer,
          external_team_id=nullif(v_row.normalized_payload->>'externalTeamId','')
        where id=v_entity_id and submission_id=p_submission_id returning id into v_entity_id;
        if not found then raise exception using errcode='42501',message='import_cross_submission_reference'; end if;
        v_updated:=v_updated+1;
      end if;
      v_team_ids:=v_team_ids||jsonb_build_object(v_row.source_key,v_entity_id);

    elsif v_row.entity_type='player' then
      v_entity_id:=v_row.existing_entity_id;
      if v_action='create' then
        insert into public.players(display_name,normalized_name,country_code,deadlock_account_id,external_player_id,source)
        values(v_row.normalized_payload->>'displayName',lower(regexp_replace(btrim(v_row.normalized_payload->>'displayName'),'\s+',' ','g')),
          nullif(v_row.normalized_payload->>'countryCode',''),nullif(v_row.normalized_payload->>'platformId',''),
          nullif(v_row.normalized_payload->>'externalPlayerId',''),'import') returning id into v_entity_id;
        v_created:=v_created+1;
      else
        if not exists(select 1 from public.tournament_roster_members rm join public.tournament_teams t on t.id=rm.tournament_team_id
          where rm.player_id=v_entity_id and t.submission_id=p_submission_id) then
          raise exception using errcode='42501',message='import_player_scope_invalid';
        end if;
        update public.players set display_name=v_row.normalized_payload->>'displayName',
          normalized_name=lower(regexp_replace(btrim(v_row.normalized_payload->>'displayName'),'\s+',' ','g')),
          country_code=nullif(v_row.normalized_payload->>'countryCode',''),
          deadlock_account_id=coalesce(nullif(v_row.normalized_payload->>'platformId',''),deadlock_account_id),
          external_player_id=coalesce(nullif(v_row.normalized_payload->>'externalPlayerId',''),external_player_id)
        where id=v_entity_id returning id into v_entity_id;
        if not found then raise exception using errcode='P0002',message='import_player_not_found'; end if;
        v_updated:=v_updated+1;
      end if;
      v_player_ids:=v_player_ids||jsonb_build_object(v_row.source_key,v_entity_id);

    elsif v_row.entity_type='roster_member' then
      v_team_id:=(v_team_ids->>(v_row.normalized_payload->>'teamKey'))::uuid;
      v_player_id:=(v_player_ids->>(v_row.normalized_payload->>'playerKey'))::uuid;
      if v_team_id is null or v_player_id is null then raise exception using errcode='22023',message='import_reference_unresolved'; end if;
      insert into public.tournament_roster_members(tournament_team_id,player_id,role,is_captain,is_active)
      values(v_team_id,v_player_id,v_row.normalized_payload->>'role',coalesce((v_row.normalized_payload->>'isCaptain')::boolean,false),true)
      on conflict(tournament_team_id,player_id,role) do update set is_active=true,is_captain=excluded.is_captain;
      if v_action='create' then v_created:=v_created+1; else v_updated:=v_updated+1; end if;

    elsif v_row.entity_type='match' then
      v_stage_id:=(v_stage_ids->>(v_row.normalized_payload->>'stageKey'))::uuid;
      v_team_a_id:=(v_team_ids->>(v_row.normalized_payload->>'teamAKey'))::uuid;
      v_team_b_id:=(v_team_ids->>(v_row.normalized_payload->>'teamBKey'))::uuid;
      v_winner_id:=(v_team_ids->>(v_row.normalized_payload->>'winnerTeamKey'))::uuid;
      if v_stage_id is null then raise exception using errcode='22023',message='import_reference_unresolved'; end if;
      v_entity_id:=v_row.existing_entity_id;
      if v_action='create' then
        insert into public.tournament_matches(submission_id,stage_id,match_number,round_name,group_name,scheduled_at,best_of,
          team_a_id,team_b_id,score_a,score_b,winner_team_id,status,deadlock_match_id,stream_url,vod_url,source)
        values(p_submission_id,v_stage_id,(v_row.normalized_payload->>'matchNumber')::integer,nullif(v_row.normalized_payload->>'round',''),
          nullif(v_row.normalized_payload->>'group',''),(v_row.normalized_payload->>'scheduledAt')::timestamptz,
          (v_row.normalized_payload->>'bestOf')::integer,v_team_a_id,v_team_b_id,(v_row.normalized_payload->>'scoreA')::integer,
          (v_row.normalized_payload->>'scoreB')::integer,v_winner_id,v_row.normalized_payload->>'status',
          nullif(v_row.normalized_payload->>'deadlockMatchId',''),nullif(v_row.normalized_payload->>'streamUrl',''),
          nullif(v_row.normalized_payload->>'vodUrl',''),'import') returning id into v_entity_id;
        v_created:=v_created+1;
      else
        if exists(select 1 from public.tournament_matches where id=v_entity_id and submission_id=p_submission_id
          and status in ('completed','walkover')) and not coalesce((v_row.resolution->>'confirmedCompletedResultOverwrite')::boolean,false) then
          raise exception using errcode='22023',message='import_completed_result_protected';
        end if;
        update public.tournament_matches set stage_id=v_stage_id,match_number=(v_row.normalized_payload->>'matchNumber')::integer,
          round_name=nullif(v_row.normalized_payload->>'round',''),group_name=nullif(v_row.normalized_payload->>'group',''),
          scheduled_at=(v_row.normalized_payload->>'scheduledAt')::timestamptz,best_of=(v_row.normalized_payload->>'bestOf')::integer,
          team_a_id=v_team_a_id,team_b_id=v_team_b_id,score_a=(v_row.normalized_payload->>'scoreA')::integer,
          score_b=(v_row.normalized_payload->>'scoreB')::integer,winner_team_id=v_winner_id,status=v_row.normalized_payload->>'status',
          deadlock_match_id=nullif(v_row.normalized_payload->>'deadlockMatchId',''),stream_url=nullif(v_row.normalized_payload->>'streamUrl',''),
          vod_url=nullif(v_row.normalized_payload->>'vodUrl','') where id=v_entity_id and submission_id=p_submission_id returning id into v_entity_id;
        if not found then raise exception using errcode='42501',message='import_cross_submission_reference'; end if;
        v_updated:=v_updated+1;
      end if;
      v_match_ids:=v_match_ids||jsonb_build_object(v_row.source_key,v_entity_id);

    elsif v_row.entity_type='standings_group_assignment' then
      v_stage_id:=(v_stage_ids->>(v_row.normalized_payload->>'stageKey'))::uuid;
      v_team_id:=(v_team_ids->>(v_row.normalized_payload->>'teamKey'))::uuid;
      if v_stage_id is null or v_team_id is null then raise exception using errcode='22023',message='import_reference_unresolved'; end if;
      insert into public.tournament_stage_standings_config(submission_id,stage_id) values(p_submission_id,v_stage_id)
        on conflict(stage_id) do nothing;
      insert into public.tournament_stage_group_teams(submission_id,stage_id,team_id,group_name,sequence_number)
      values(p_submission_id,v_stage_id,v_team_id,v_row.normalized_payload->>'groupName',
        coalesce((v_row.normalized_payload->>'sequenceNumber')::integer,1))
      on conflict(stage_id,team_id) do update set group_name=excluded.group_name,sequence_number=excluded.sequence_number;
      if v_action='create' then v_created:=v_created+1; else v_updated:=v_updated+1; end if;

    elsif v_row.entity_type='bracket_link' then
      v_source_id:=(v_match_ids->>(v_row.normalized_payload->>'sourceMatchKey'))::uuid;
      v_target_id:=(v_match_ids->>(v_row.normalized_payload->>'targetMatchKey'))::uuid;
      select stage_id into v_stage_id from public.tournament_matches where id=v_source_id and submission_id=p_submission_id;
      if v_source_id is null or v_target_id is null or v_stage_id is null then raise exception using errcode='22023',message='import_reference_unresolved'; end if;
      insert into public.tournament_bracket_links(submission_id,stage_id,source_match_id,outcome,target_match_id,target_slot)
      values(p_submission_id,v_stage_id,v_source_id,v_row.normalized_payload->>'outcome',v_target_id,v_row.normalized_payload->>'targetSlot')
      on conflict(source_match_id,outcome) do update set target_match_id=excluded.target_match_id,target_slot=excluded.target_slot;
      if v_action='create' then v_created:=v_created+1; else v_updated:=v_updated+1; end if;
    end if;
  end loop;

  v_summary:=jsonb_build_object('created',v_created,'updated',v_updated,'skipped',v_skipped,
    'conflicts_resolved',v_conflicts_resolved,'failed_rows',0,
    'duration_ms',floor(extract(epoch from (clock_timestamp()-v_started_at))*1000),
    'imported_sheets',v_session.detected_sheets);
  update public.tournament_import_sessions set status='completed',applied_at=now(),import_summary=v_summary where id=p_session_id;
  delete from public.tournament_import_rows where session_id=p_session_id;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'import_completed',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('session_id',p_session_id,'source_type',v_session.source_type,'template_type',v_session.template_type,
      'counts',v_summary,'error_count',0,'warning_count',coalesce((v_session.validation_summary->>'warnings')::integer,0),
      'fingerprint_prefix',left(v_session.source_fingerprint,12),'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return v_summary;
end;
$$;

create or replace function public.cancel_tournament_import_session(
  p_session_id uuid,p_submission_id uuid,p_actor_type text,p_actor_id uuid,p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_session public.tournament_import_sessions;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  update public.tournament_import_sessions set status='cancelled' where id=p_session_id and submission_id=p_submission_id
    and status not in ('applying','completed','cancelled','expired') returning * into v_session;
  if not found then raise exception using errcode='22023',message='import_session_not_cancellable'; end if;
  delete from public.tournament_import_rows where session_id=p_session_id;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'import_cancelled',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('session_id',p_session_id,'source_type',v_session.source_type,'template_type',v_session.template_type,
      'fingerprint_prefix',left(v_session.source_fingerprint,12),'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return jsonb_build_object('id',p_session_id,'status','cancelled');
end; $$;

create or replace function public.mark_tournament_import_failed(
  p_session_id uuid,p_submission_id uuid,p_actor_type text,p_actor_id uuid,p_workspace_token_id uuid,p_error_code text
) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_session public.tournament_import_sessions;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  update public.tournament_import_sessions set status='failed',import_summary=jsonb_build_object('error_code',left(p_error_code,80))
    where id=p_session_id and submission_id=p_submission_id and status<>'completed' returning * into v_session;
  if found then insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
    values(p_submission_id,'import_failed',case when p_actor_type='admin' then 'admin' else 'organizer' end,
      case when p_actor_type='admin' then p_actor_id else null end,
      jsonb_build_object('session_id',p_session_id,'error_code',left(p_error_code,80),
        'fingerprint_prefix',left(v_session.source_fingerprint,12),'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  end if;
end; $$;

revoke all on function public.apply_tournament_import_session(uuid,uuid,text,uuid,uuid),
  public.cancel_tournament_import_session(uuid,uuid,text,uuid,uuid),
  public.mark_tournament_import_failed(uuid,uuid,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.apply_tournament_import_session(uuid,uuid,text,uuid,uuid),
  public.cancel_tournament_import_session(uuid,uuid,text,uuid,uuid),
  public.mark_tournament_import_failed(uuid,uuid,text,uuid,uuid,text) to service_role;
