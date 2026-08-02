-- Atomically resolve import conflicts and protect concurrent preview updates.

alter table public.tournament_import_rows
  add column resolution_status text not null default 'unresolved',
  add constraint tournament_import_resolution_status_allowed check (
    resolution_status in ('unresolved','resolved')
  );

update public.tournament_import_rows set resolution_status='resolved'
where resolution is not null;

create or replace function public.resolve_tournament_import_conflict(
  p_session_id uuid,
  p_submission_id uuid,
  p_row_id uuid,
  p_decision text,
  p_existing_entity_id uuid,
  p_confirmed_completed_result_overwrite boolean,
  p_expected_session_updated_at timestamptz,
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
  v_existing_id uuid;
  v_target_action text;
  v_unresolved integer;
  v_invalid integer;
  v_create integer;
  v_update integer;
  v_skip integer;
  v_status text;
  v_resolution jsonb;
  v_link_valid boolean := false;
  v_high_risk boolean := false;
begin
  if p_decision not in ('keep_existing','use_spreadsheet','skip','link_existing','create_new') then
    raise exception using errcode='22023',message='import_resolution_invalid';
  end if;
  perform public.assert_operational_mutation_access(
    p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id
  );
  select * into v_session from public.tournament_import_sessions
  where id=p_session_id and submission_id=p_submission_id for update;
  if not found then
    raise exception using errcode='P0002',message='import_session_not_found';
  end if;
  if v_session.status in ('applying','completed','cancelled','expired','failed') then
    raise exception using errcode='22023',message='import_session_locked';
  end if;
  if v_session.expires_at<=now() then
    update public.tournament_import_sessions set status='expired' where id=p_session_id;
    raise exception using errcode='22023',message='import_session_expired';
  end if;
  if (p_actor_type='admin' and (
      v_session.created_by_actor_type<>'admin' or v_session.created_by_actor_id<>p_actor_id
    )) or (p_actor_type='organizer_workspace' and (
      v_session.created_by_actor_type<>'organizer_workspace'
      or v_session.created_by_workspace_token_id<>p_workspace_token_id
    )) then
    raise exception using errcode='42501',message='import_session_actor_mismatch';
  end if;

  select * into v_row from public.tournament_import_rows
  where id=p_row_id and session_id=p_session_id for update;
  if not found then
    raise exception using errcode='P0002',message='import_row_not_found';
  end if;
  if v_row.resolution_status='resolved' then
    if v_row.resolution->>'decision'=p_decision
      and (p_decision<>'link_existing' or v_row.existing_entity_id is not distinct from p_existing_entity_id) then
      return jsonb_build_object(
        'row_id',v_row.id,'status','resolved','idempotent',true,
        'proposed_action',v_row.proposed_action
      );
    end if;
    raise exception using errcode='22023',message='import_resolution_already_resolved';
  end if;
  if v_session.updated_at is distinct from p_expected_session_updated_at then
    raise exception using errcode='40001',message='import_session_stale';
  end if;
  if v_row.proposed_action<>'conflict' then
    raise exception using errcode='22023',message='import_row_not_conflict';
  end if;

  if p_decision='keep_existing' then
    v_existing_id:=v_row.existing_entity_id;
    if v_existing_id is null then
      raise exception using errcode='22023',message='import_resolution_existing_not_found';
    end if;
    v_target_action:='skip';
  elsif p_decision='skip' then
    v_existing_id:=null;
    v_target_action:='skip';
  elsif p_decision='link_existing' then
    if p_existing_entity_id is null then
      raise exception using errcode='22023',message='import_resolution_existing_required';
    end if;
    if v_row.entity_type='stage' then
      select exists(select 1 from public.tournament_stages where id=p_existing_entity_id and submission_id=p_submission_id) into v_link_valid;
    elsif v_row.entity_type='team' then
      select exists(select 1 from public.tournament_teams where id=p_existing_entity_id and submission_id=p_submission_id) into v_link_valid;
    elsif v_row.entity_type='match' then
      select exists(select 1 from public.tournament_matches where id=p_existing_entity_id and submission_id=p_submission_id) into v_link_valid;
    elsif v_row.entity_type='player' then
      select exists(
        select 1 from public.tournament_roster_members rm
        join public.tournament_teams t on t.id=rm.tournament_team_id
        where rm.player_id=p_existing_entity_id and t.submission_id=p_submission_id
      ) into v_link_valid;
    end if;
    if not v_link_valid then
      raise exception using errcode='42501',message='import_resolution_existing_rejected';
    end if;
    v_existing_id:=p_existing_entity_id;
    v_target_action:='update';
  elsif p_decision='create_new' then
    v_existing_id:=null;
    v_target_action:='create';
  else
    v_existing_id:=v_row.existing_entity_id;
    v_target_action:=case when v_existing_id is null then 'create' else 'update' end;
    v_high_risk:=v_row.entity_type='match'
      and v_row.validation_errors@>jsonb_build_array('completed_match_requires_explicit_resolution');
    if v_high_risk and not coalesce(p_confirmed_completed_result_overwrite,false) then
      raise exception using errcode='22023',message='import_completed_result_confirmation_required';
    end if;
  end if;

  v_resolution:=jsonb_build_object(
    'decision',p_decision,
    'existingEntityId',v_existing_id,
    'confirmedCompletedResultOverwrite',v_high_risk and coalesce(p_confirmed_completed_result_overwrite,false)
  );
  update public.tournament_import_rows set
    resolution=v_resolution,
    resolution_status='resolved',
    proposed_action=v_target_action,
    existing_entity_id=v_existing_id,
    validation_status=case when jsonb_array_length(warnings)>0 then 'warning' else 'valid' end
  where id=v_row.id;

  select
    count(*) filter(where proposed_action='conflict' and resolution_status='unresolved'),
    count(*) filter(where proposed_action='invalid'),
    count(*) filter(where proposed_action='create'),
    count(*) filter(where proposed_action='update'),
    count(*) filter(where proposed_action='skip')
  into v_unresolved,v_invalid,v_create,v_update,v_skip
  from public.tournament_import_rows where session_id=p_session_id;
  v_status:=case
    when v_unresolved>0 or v_invalid>0 or v_session.timezone_confirmation_required then 'validation_failed'
    else 'ready'
  end;
  update public.tournament_import_sessions set
    status=v_status,
    validation_summary=validation_summary||jsonb_build_object(
      'conflict',v_unresolved,'invalid',v_invalid,
      'create',v_create,'update',v_update,'skip',v_skip
    )
  where id=p_session_id
  returning updated_at into p_expected_session_updated_at;

  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(
    p_submission_id,'import_conflicts_resolved',
    case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object(
      'session_id',p_session_id,'row_id',p_row_id,'decision',p_decision,
      'operational_version','v1'
    )||public.operational_actor_metadata(p_actor_type)
  );
  return jsonb_build_object(
    'row_id',p_row_id,'status','resolved','idempotent',false,
    'proposed_action',v_target_action,
    'session_status',v_status,'session_updated_at',p_expected_session_updated_at,
    'unresolved_conflicts',v_unresolved
  );
end; $$;
revoke all on function public.resolve_tournament_import_conflict(uuid,uuid,uuid,text,uuid,boolean,timestamptz,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.resolve_tournament_import_conflict(uuid,uuid,uuid,text,uuid,boolean,timestamptz,text,uuid,uuid) to service_role;
