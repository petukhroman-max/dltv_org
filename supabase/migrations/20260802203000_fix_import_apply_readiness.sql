-- Keep canonical conflict resolution and apply readiness derived from current rows.

alter function public.resolve_tournament_import_conflict(
  uuid,uuid,uuid,text,uuid,boolean,timestamptz,text,uuid,uuid
) rename to resolve_tournament_import_conflict_row;

create or replace function public.recompute_tournament_import_readiness(
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
  v_blocker public.tournament_import_rows;
  v_unresolved integer;
  v_invalid integer;
  v_blocking integer;
  v_create integer;
  v_update integer;
  v_skip integer;
  v_status text;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id
  );
  select * into v_session from public.tournament_import_sessions
  where id=p_session_id and submission_id=p_submission_id for update;
  if not found then
    raise exception using errcode='P0002',message='import_session_not_found';
  end if;
  if (p_actor_type='admin' and (
      v_session.created_by_actor_type<>'admin' or v_session.created_by_actor_id<>p_actor_id
    )) or (p_actor_type='organizer_workspace' and (
      v_session.created_by_actor_type<>'organizer_workspace'
      or v_session.created_by_workspace_token_id<>p_workspace_token_id
    )) then
    raise exception using errcode='42501',message='import_session_actor_mismatch';
  end if;
  if v_session.expires_at<=now() then
    update public.tournament_import_sessions set status='expired' where id=p_session_id;
    raise exception using errcode='22023',message='import_session_expired';
  end if;
  if v_session.status in ('applying','completed','cancelled','expired') then
    return jsonb_build_object('ready',false,'status',v_session.status);
  end if;

  select
    count(*) filter(where proposed_action='conflict' and resolution_status='unresolved'),
    count(*) filter(where proposed_action='invalid' or validation_status='invalid'),
    count(*) filter(where
      proposed_action='invalid' or validation_status='invalid'
      or (proposed_action='conflict' and resolution_status='unresolved')
    ),
    count(*) filter(where proposed_action='create'),
    count(*) filter(where proposed_action='update'),
    count(*) filter(where proposed_action='skip')
  into v_unresolved,v_invalid,v_blocking,v_create,v_update,v_skip
  from public.tournament_import_rows where session_id=p_session_id;

  select * into v_blocker from public.tournament_import_rows
  where session_id=p_session_id and (
    proposed_action='invalid' or validation_status='invalid'
    or (proposed_action='conflict' and resolution_status='unresolved')
  ) order by
    case entity_type when 'stage' then 1 when 'team' then 2 when 'player' then 3
      when 'roster_member' then 4 when 'match' then 5 else 6 end,
    source_sheet,source_row_number,id
  limit 1;

  v_status:=case
    when v_blocking>0 or v_session.timezone_confirmation_required then 'validation_failed'
    else 'ready'
  end;
  update public.tournament_import_sessions set
    status=v_status,
    validation_summary=validation_summary||jsonb_build_object(
      'conflict',v_unresolved,
      'unresolved_conflict_count',v_unresolved,
      'invalid',v_invalid,
      'blocking_error_count',v_blocking,
      'create',v_create,'update',v_update,'skip',v_skip
    )
  where id=p_session_id;

  return jsonb_build_object(
    'ready',v_status='ready','status',v_status,
    'blocking_error_count',v_blocking,
    'unresolved_conflict_count',v_unresolved,
    'blocker',case when v_blocker.id is null then null else jsonb_build_object(
      'entity_type',v_blocker.entity_type,
      'source_sheet',v_blocker.source_sheet,
      'source_row_number',v_blocker.source_row_number
    ) end
  );
end; $$;

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
  v_result jsonb;
  v_row public.tournament_import_rows;
  v_group_count integer;
  v_readiness jsonb;
begin
  v_result:=public.resolve_tournament_import_conflict_row(
    p_session_id,p_submission_id,p_row_id,p_decision,p_existing_entity_id,
    p_confirmed_completed_result_overwrite,p_expected_session_updated_at,
    p_actor_type,p_actor_id,p_workspace_token_id
  );
  select * into v_row from public.tournament_import_rows
  where id=p_row_id and session_id=p_session_id for update;

  -- A canonical row may represent several spreadsheet rows. Older previews can
  -- also contain one persisted row per source reference, so resolve overlapping
  -- members as aliases and keep only the selected canonical operation executable.
  with canonical_group as (
    select candidate.id
    from public.tournament_import_rows candidate
    where candidate.session_id=p_session_id
      and candidate.entity_type=v_row.entity_type
      and (
        candidate.id=v_row.id
        or candidate.source_key=v_row.source_key
        or exists (
          select 1
          from jsonb_array_elements(candidate.source_references) candidate_ref
          join jsonb_array_elements(v_row.source_references) selected_ref
            on candidate_ref->>'sheet'=selected_ref->>'sheet'
           and candidate_ref->>'row'=selected_ref->>'row'
        )
      )
  ), updated as (
    update public.tournament_import_rows target set
      resolution=v_row.resolution,
      resolution_status='resolved',
      proposed_action=case when target.id=v_row.id then v_row.proposed_action else 'skip' end,
      existing_entity_id=case
        when target.id=v_row.id then v_row.existing_entity_id
        when v_row.existing_entity_id is not null then v_row.existing_entity_id
        else target.existing_entity_id
      end,
      validation_errors='[]'::jsonb,
      validation_status=case when jsonb_array_length(target.warnings)>0 then 'warning' else 'valid' end
    from canonical_group where target.id=canonical_group.id
    returning target.id
  ) select count(*) into v_group_count from updated;

  v_readiness:=public.recompute_tournament_import_readiness(
    p_session_id,p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id
  );
  return v_result||v_readiness||jsonb_build_object('canonical_group_rows',v_group_count);
end; $$;

revoke all on function public.resolve_tournament_import_conflict_row(uuid,uuid,uuid,text,uuid,boolean,timestamptz,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.recompute_tournament_import_readiness(uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.resolve_tournament_import_conflict(uuid,uuid,uuid,text,uuid,boolean,timestamptz,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.recompute_tournament_import_readiness(uuid,uuid,text,uuid,uuid) to service_role;
grant execute on function public.resolve_tournament_import_conflict(uuid,uuid,uuid,text,uuid,boolean,timestamptz,text,uuid,uuid) to service_role;
