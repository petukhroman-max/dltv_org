-- Fix pgcrypto lookup and persist safe row-level diagnostics after atomic rollback.

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
  v_batch_index integer := 0;
  v_started_at timestamptz := clock_timestamp();
  v_summary jsonb;
  v_step text := 'session_preflight';
  v_sqlstate text;
  v_constraint text;
  v_table text;
  v_message text;
  v_failure_code text;
  v_safe_source_key text;
  v_failure jsonb;
begin
  perform public.assert_operational_mutation_access(
    p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id
  );
  select * into v_session from public.tournament_import_sessions
  where id=p_session_id and submission_id=p_submission_id for update;
  if not found then raise exception using errcode='P0002',message='import_session_not_found'; end if;
  if v_session.status='completed' then
    return v_session.import_summary||jsonb_build_object('success',true,'idempotent',true);
  end if;
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
    select 1 from public.tournament_import_rows where session_id=p_session_id and (
      proposed_action='invalid' or validation_status='invalid'
      or (proposed_action='conflict' and resolution_status='unresolved')
    )
  ) then raise exception using errcode='22023',message='import_blocking_rows_unresolved'; end if;

  -- The inner block is a PostgreSQL subtransaction. Any entity write is rolled
  -- back before the exception handler persists safe failure metadata.
  begin
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
      v_batch_index:=v_batch_index+1;
      v_action:=v_row.proposed_action;
      v_decision:=v_row.resolution->>'decision';
      v_step:='resolve_action';
      if v_action='conflict' then
        v_conflicts_resolved:=v_conflicts_resolved+1;
        if v_decision in ('keep_existing','skip') then v_action:='skip';
        elsif v_decision='link_existing' then
          v_action:='update';
          v_row.existing_entity_id:=(v_row.resolution->>'existingEntityId')::uuid;
        elsif v_decision='create_new' then v_action:='create';
        elsif v_decision='use_spreadsheet' then v_action:='update';
        else raise exception using errcode='22023',message='import_resolution_invalid'; end if;
      end if;
      if v_action='skip' then
        v_step:='register_existing_reference';
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
        v_step:='stage_slug';
        v_slug:=coalesce(nullif(trim(both '-' from regexp_replace(lower(v_row.normalized_payload->>'name'),'[^a-z0-9]+','-','g')),''),'imported')
          ||'-'||left(encode(extensions.digest(v_row.source_key,'sha256'),'hex'),8);
        v_step:=case when v_action='create' then 'create_stage' else 'update_stage' end;
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
        v_step:='team_slug';
        v_slug:=coalesce(nullif(trim(both '-' from regexp_replace(lower(v_row.normalized_payload->>'name'),'[^a-z0-9]+','-','g')),''),'imported')
          ||'-'||left(encode(extensions.digest(v_row.source_key,'sha256'),'hex'),8);
        v_step:=case when v_action='create' then 'create_team' else 'update_team' end;
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
        v_step:=case when v_action='create' then 'create_player' else 'update_player' end;
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
        v_step:='resolve_roster_references';
        v_team_id:=(v_team_ids->>(v_row.normalized_payload->>'teamKey'))::uuid;
        v_player_id:=(v_player_ids->>(v_row.normalized_payload->>'playerKey'))::uuid;
        if v_team_id is null or v_player_id is null then raise exception using errcode='22023',message='import_reference_unresolved'; end if;
        v_step:='upsert_roster_member';
        insert into public.tournament_roster_members(tournament_team_id,player_id,role,is_captain,is_active)
        values(v_team_id,v_player_id,v_row.normalized_payload->>'role',coalesce((v_row.normalized_payload->>'isCaptain')::boolean,false),true)
        on conflict(tournament_team_id,player_id,role) do update set is_active=true,is_captain=excluded.is_captain;
        if v_action='create' then v_created:=v_created+1; else v_updated:=v_updated+1; end if;

      elsif v_row.entity_type='match' then
        v_step:='resolve_match_references';
        v_stage_id:=(v_stage_ids->>(v_row.normalized_payload->>'stageKey'))::uuid;
        v_team_a_id:=(v_team_ids->>(v_row.normalized_payload->>'teamAKey'))::uuid;
        v_team_b_id:=(v_team_ids->>(v_row.normalized_payload->>'teamBKey'))::uuid;
        v_winner_id:=(v_team_ids->>(v_row.normalized_payload->>'winnerTeamKey'))::uuid;
        if v_stage_id is null then raise exception using errcode='22023',message='import_reference_unresolved'; end if;
        v_entity_id:=v_row.existing_entity_id;
        v_step:=case when v_action='create' then 'create_match' else 'update_match' end;
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
        v_step:='resolve_standings_references';
        v_stage_id:=(v_stage_ids->>(v_row.normalized_payload->>'stageKey'))::uuid;
        v_team_id:=(v_team_ids->>(v_row.normalized_payload->>'teamKey'))::uuid;
        if v_stage_id is null or v_team_id is null then raise exception using errcode='22023',message='import_reference_unresolved'; end if;
        v_step:='upsert_standings_assignment';
        insert into public.tournament_stage_standings_config(submission_id,stage_id) values(p_submission_id,v_stage_id)
          on conflict(stage_id) do nothing;
        insert into public.tournament_stage_group_teams(submission_id,stage_id,team_id,group_name,sequence_number)
        values(p_submission_id,v_stage_id,v_team_id,v_row.normalized_payload->>'groupName',
          coalesce((v_row.normalized_payload->>'sequenceNumber')::integer,1))
        on conflict(stage_id,team_id) do update set group_name=excluded.group_name,sequence_number=excluded.sequence_number;
        if v_action='create' then v_created:=v_created+1; else v_updated:=v_updated+1; end if;

      elsif v_row.entity_type='bracket_link' then
        v_step:='resolve_bracket_references';
        v_source_id:=(v_match_ids->>(v_row.normalized_payload->>'sourceMatchKey'))::uuid;
        v_target_id:=(v_match_ids->>(v_row.normalized_payload->>'targetMatchKey'))::uuid;
        select stage_id into v_stage_id from public.tournament_matches where id=v_source_id and submission_id=p_submission_id;
        if v_source_id is null or v_target_id is null or v_stage_id is null then raise exception using errcode='22023',message='import_reference_unresolved'; end if;
        v_step:='upsert_bracket_link';
        insert into public.tournament_bracket_links(submission_id,stage_id,source_match_id,outcome,target_match_id,target_slot)
        values(p_submission_id,v_stage_id,v_source_id,v_row.normalized_payload->>'outcome',v_target_id,v_row.normalized_payload->>'targetSlot')
        on conflict(source_match_id,outcome) do update set target_match_id=excluded.target_match_id,target_slot=excluded.target_slot;
        if v_action='create' then v_created:=v_created+1; else v_updated:=v_updated+1; end if;
      end if;
    end loop;

    v_summary:=jsonb_build_object('success',true,'idempotent',false,
      'created',v_created,'updated',v_updated,'skipped',v_skipped,
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
  exception when others then
    get stacked diagnostics
      v_sqlstate=returned_sqlstate,
      v_constraint=constraint_name,
      v_table=table_name,
      v_message=message_text;
    v_failure_code:=case
      when v_message='import_reference_unresolved' then 'import_reference_unresolved'
      when v_message='import_cross_submission_reference' then 'import_cross_submission_reference'
      when v_message='import_completed_result_protected' then 'import_completed_result_protected'
      when v_sqlstate='42883' then 'import_database_function_missing'
      when v_sqlstate='23505' then 'import_unique_constraint'
      when v_sqlstate='23514' then 'import_check_constraint'
      when v_sqlstate='23503' then 'import_foreign_key_constraint'
      when v_sqlstate='22P02' then 'import_value_format_invalid'
      else 'import_database_error'
    end;
    v_safe_source_key:=case
      when v_row.entity_type in ('player','roster_member') then '[redacted]'
      else left(v_row.source_key,200)
    end;
    v_failure:=jsonb_build_object(
      'failure_code',v_failure_code,
      'database_code',v_sqlstate,
      'constraint_name',nullif(left(v_constraint,120),''),
      'table_name',nullif(left(v_table,120),''),
      'function_name','apply_tournament_import_session',
      'entity_type',v_row.entity_type,
      'source_sheet',v_row.source_sheet,
      'source_row_number',v_row.source_row_number,
      'source_key',v_safe_source_key,
      'proposed_action',v_action,
      'import_step',v_step,
      'batch_index',v_batch_index
    );
    update public.tournament_import_sessions set
      status='failed',applied_at=null,
      import_summary=jsonb_build_object('success',false,'failure',v_failure)
    where id=p_session_id;
    insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
    values(p_submission_id,'import_failed',case when p_actor_type='admin' then 'admin' else 'organizer' end,
      case when p_actor_type='admin' then p_actor_id else null end,
      jsonb_build_object('session_id',p_session_id,'failure',v_failure,
        'fingerprint_prefix',left(v_session.source_fingerprint,12),'operational_version','v1')
        ||public.operational_actor_metadata(p_actor_type));
    return jsonb_build_object('success',false,'failure',v_failure);
  end;
end; $$;

revoke all on function public.apply_tournament_import_session(uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_tournament_import_session(uuid,uuid,text,uuid,uuid) to service_role;
