-- Tournament brackets and derived standings.
-- All writes remain service-role RPCs guarded by operational access checks.

alter table public.tournament_stages
  add column bracket_type text null,
  add constraint tournament_stages_bracket_type_allowed check (
    bracket_type is null or bracket_type in ('single_elimination', 'double_elimination')
  ),
  add constraint tournament_stages_bracket_type_compatible check (
    bracket_type is null or stage_type in (
      'single_elimination', 'double_elimination', 'playoff', 'final', 'custom'
    )
  );

alter table public.tournament_matches
  add column bracket_section text null,
  add column bracket_round integer null,
  add column bracket_position integer null,
  add constraint tournament_matches_bracket_section_allowed check (
    bracket_section is null or bracket_section in ('main', 'winners', 'losers', 'grand_final', 'third_place')
  ),
  add constraint tournament_matches_bracket_coordinates_complete check (
    (bracket_section is null and bracket_round is null and bracket_position is null)
    or (bracket_section is not null and bracket_round > 0 and bracket_position > 0)
  );

create unique index tournament_matches_bracket_position_key
  on public.tournament_matches(stage_id, bracket_section, bracket_round, bracket_position)
  where bracket_section is not null;
create unique index tournament_matches_grand_final_stage_key
  on public.tournament_matches(stage_id)
  where bracket_section = 'grand_final';

create table public.tournament_bracket_links (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.tournament_submissions(id) on delete cascade,
  stage_id uuid not null references public.tournament_stages(id) on delete cascade,
  source_match_id uuid not null references public.tournament_matches(id) on delete cascade,
  outcome text not null,
  target_match_id uuid not null references public.tournament_matches(id) on delete cascade,
  target_slot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_bracket_links_outcome_allowed check (outcome in ('winner', 'loser')),
  constraint tournament_bracket_links_target_slot_allowed check (target_slot in ('team_a', 'team_b')),
  constraint tournament_bracket_links_distinct_matches check (source_match_id <> target_match_id),
  constraint tournament_bracket_links_source_outcome_key unique (source_match_id, outcome),
  constraint tournament_bracket_links_target_slot_key unique (target_match_id, target_slot)
);

create table public.tournament_stage_standings_config (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.tournament_submissions(id) on delete cascade,
  stage_id uuid not null references public.tournament_stages(id) on delete cascade,
  enabled boolean not null default true,
  points_for_win integer not null default 3,
  points_for_loss integer not null default 0,
  points_for_walkover integer not null default 3,
  score_difference_enabled boolean not null default true,
  qualification_places integer null,
  calculation_mode text not null default 'automatic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_standings_points_range check (
    points_for_win between 0 and 100 and points_for_loss between 0 and 100
    and points_for_walkover between 0 and 100
  ),
  constraint tournament_standings_qualification_positive check (
    qualification_places is null or qualification_places > 0
  ),
  constraint tournament_standings_calculation_mode_allowed check (
    calculation_mode in ('automatic', 'manual_adjustment')
  ),
  constraint tournament_stage_standings_config_stage_key unique(stage_id)
);

create table public.tournament_stage_group_teams (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.tournament_submissions(id) on delete cascade,
  stage_id uuid not null references public.tournament_stages(id) on delete cascade,
  team_id uuid not null references public.tournament_teams(id) on delete cascade,
  group_name text not null default 'default',
  sequence_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_stage_group_name_not_blank check (btrim(group_name) <> ''),
  constraint tournament_stage_group_sequence_positive check (sequence_number > 0),
  constraint tournament_stage_group_team_key unique (stage_id, group_name, team_id),
  constraint tournament_stage_team_once_key unique (stage_id, team_id)
);

create table public.tournament_standing_adjustments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.tournament_submissions(id) on delete cascade,
  stage_id uuid not null references public.tournament_stages(id) on delete cascade,
  team_id uuid not null references public.tournament_teams(id) on delete cascade,
  points_adjustment integer not null default 0,
  rank_override integer null,
  qualified_override boolean null,
  public_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_standing_adjustment_public_note_length check (
    public_note is null or (btrim(public_note) <> '' and char_length(public_note) <= 500)
  ),
  constraint tournament_standing_adjustment_rank_positive check (
    rank_override is null or rank_override > 0
  ),
  constraint tournament_standing_adjustment_points_range check (points_adjustment between -10000 and 10000),
  constraint tournament_standing_adjustment_stage_team_key unique (stage_id, team_id)
);

create trigger tournament_bracket_links_set_updated_at before update
on public.tournament_bracket_links for each row execute function public.set_updated_at();
create trigger tournament_stage_standings_config_set_updated_at before update
on public.tournament_stage_standings_config for each row execute function public.set_updated_at();
create trigger tournament_stage_group_teams_set_updated_at before update
on public.tournament_stage_group_teams for each row execute function public.set_updated_at();
create trigger tournament_standing_adjustments_set_updated_at before update
on public.tournament_standing_adjustments for each row execute function public.set_updated_at();

create or replace function public.validate_bracket_standings_scope()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare v_stage_submission uuid; v_team_submission uuid; v_stage_type text; v_bracket_type text;
  v_source record; v_target record; v_expected_team uuid;
begin
  select submission_id,stage_type,bracket_type into v_stage_submission,v_stage_type,v_bracket_type
  from public.tournament_stages where id = new.stage_id;
  if v_stage_submission is distinct from new.submission_id then
    raise exception using errcode = '23514', message = 'bracket_standings_scope_invalid';
  end if;
  if tg_table_name in ('tournament_stage_group_teams', 'tournament_standing_adjustments') then
    select submission_id into v_team_submission from public.tournament_teams where id = new.team_id;
    if v_team_submission is distinct from new.submission_id then
      raise exception using errcode = '23514', message = 'bracket_standings_scope_invalid';
    end if;
  end if;
  if tg_table_name = 'tournament_bracket_links' then
    if new.outcome='loser' and coalesce(v_bracket_type,v_stage_type)<>'double_elimination' then
      raise exception using errcode='23514',message='bracket_loser_link_unsupported';
    end if;
    select submission_id, stage_id, bracket_section, bracket_round, status, team_a_id, team_b_id, winner_team_id into v_source from public.tournament_matches where id = new.source_match_id;
    select submission_id, stage_id, status, bracket_section, bracket_round, team_a_id, team_b_id into v_target from public.tournament_matches where id = new.target_match_id;
    if v_source.submission_id is distinct from new.submission_id
      or v_target.submission_id is distinct from new.submission_id
      or v_source.stage_id is distinct from new.stage_id
      or v_target.stage_id is distinct from new.stage_id then
      raise exception using errcode = '23514', message = 'bracket_link_scope_invalid';
    end if;
    if v_target.status in ('completed', 'walkover') then
      raise exception using errcode = '23503', message = 'bracket_target_has_result';
    end if;
    if v_source.bracket_round is null or v_target.bracket_round is null
      or (v_source.bracket_section = v_target.bracket_section and v_target.bracket_round <= v_source.bracket_round)
      or (v_source.bracket_section <> v_target.bracket_section and v_target.bracket_section <> 'grand_final'
        and v_target.bracket_section <> 'third_place' and v_target.bracket_round < v_source.bracket_round)
    then
      raise exception using errcode = '23514', message = 'bracket_invalid_round_direction';
    end if;
    v_expected_team := case when v_source.status in ('completed','walkover') then
      case new.outcome when 'winner' then v_source.winner_team_id else
        case when v_source.winner_team_id=v_source.team_a_id then v_source.team_b_id else v_source.team_a_id end end
      else null end;
    if (new.target_slot='team_a' and v_target.team_a_id is not null and v_target.team_a_id is distinct from v_expected_team)
      or (new.target_slot='team_b' and v_target.team_b_id is not null and v_target.team_b_id is distinct from v_expected_team) then
      raise exception using errcode='23503', message='bracket_target_slot_occupied';
    end if;
  end if;
  return new;
end; $$;

create trigger tournament_bracket_links_validate_scope before insert or update
on public.tournament_bracket_links for each row execute function public.validate_bracket_standings_scope();
create trigger tournament_stage_standings_config_validate_scope before insert or update
on public.tournament_stage_standings_config for each row execute function public.validate_bracket_standings_scope();
create trigger tournament_stage_group_teams_validate_scope before insert or update
on public.tournament_stage_group_teams for each row execute function public.validate_bracket_standings_scope();
create trigger tournament_standing_adjustments_validate_scope before insert or update
on public.tournament_standing_adjustments for each row execute function public.validate_bracket_standings_scope();

create or replace function public.assert_bracket_link_acyclic()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare v_cycle boolean;
begin
  with recursive downstream(match_id) as (
    select new.target_match_id
    union
    select l.target_match_id from public.tournament_bracket_links l
    join downstream d on l.source_match_id = d.match_id
    where l.id is distinct from new.id
  ) select exists(select 1 from downstream where match_id = new.source_match_id) into v_cycle;
  if v_cycle then raise exception using errcode = '23514', message = 'bracket_link_cycle'; end if;
  return new;
end; $$;

create trigger tournament_bracket_links_acyclic before insert or update
on public.tournament_bracket_links for each row execute function public.assert_bracket_link_acyclic();

create or replace function public.perform_bracket_advancement(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_match public.tournament_matches; v_link public.tournament_bracket_links; v_team uuid;
  v_existing uuid; v_advanced integer := 0; v_conflicts integer := 0;
begin
  select * into v_match from public.tournament_matches where id = p_match_id for update;
  if not found or v_match.status not in ('completed', 'walkover') or v_match.winner_team_id is null then
    return jsonb_build_object('advanced', 0, 'conflicts', 0);
  end if;
  for v_link in select * from public.tournament_bracket_links where source_match_id = p_match_id order by outcome loop
    v_team := case v_link.outcome when 'winner' then v_match.winner_team_id else
      case when v_match.team_a_id = v_match.winner_team_id then v_match.team_b_id else v_match.team_a_id end end;
    if v_team is null then continue; end if;
    if v_link.target_slot = 'team_a' then
      select team_a_id into v_existing from public.tournament_matches where id = v_link.target_match_id for update;
      if v_existing is null then update public.tournament_matches set team_a_id = v_team where id = v_link.target_match_id; end if;
    else
      select team_b_id into v_existing from public.tournament_matches where id = v_link.target_match_id for update;
      if v_existing is null then update public.tournament_matches set team_b_id = v_team where id = v_link.target_match_id; end if;
    end if;
    if v_existing is null or v_existing = v_team then
      v_advanced := v_advanced + 1;
      insert into public.submission_events(submission_id,event_type,actor_type,metadata)
      values(v_match.submission_id,'bracket_team_advanced','system',jsonb_build_object(
        'source_match_id',p_match_id,'target_match_id',v_link.target_match_id,'outcome',v_link.outcome,
        'target_slot',v_link.target_slot,'team_id',v_team,'operational_version','v1'));
    else
      v_conflicts := v_conflicts + 1;
      insert into public.submission_events(submission_id,event_type,actor_type,metadata)
      values(v_match.submission_id,'bracket_advancement_conflict','system',jsonb_build_object(
        'source_match_id',p_match_id,'target_match_id',v_link.target_match_id,'outcome',v_link.outcome,
        'target_slot',v_link.target_slot,'team_id',v_team,'existing_team_id',v_existing,
        'operational_version','v1'));
    end if;
  end loop;
  return jsonb_build_object('advanced', v_advanced, 'conflicts', v_conflicts);
end; $$;

create or replace function public.advance_bracket_after_result()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.status in ('completed','walkover') and new.winner_team_id is not null
    and (old.status is distinct from new.status or old.winner_team_id is distinct from new.winner_team_id) then
    perform public.perform_bracket_advancement(new.id);
  end if;
  return new;
end; $$;

create trigger tournament_matches_advance_bracket after update of status, winner_team_id
on public.tournament_matches for each row execute function public.advance_bracket_after_result();

create or replace function public.assign_match_bracket_position(
  p_submission_id uuid, p_match_id uuid, p_expected_updated_at timestamptz,
  p_payload jsonb, p_actor_type text, p_actor_id uuid, p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_match public.tournament_matches; v_stage public.tournament_stages;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  v_match := public.lock_tournament_match(p_submission_id,p_match_id,p_expected_updated_at);
  select * into v_stage from public.tournament_stages where id = v_match.stage_id and submission_id = p_submission_id;
  if not found or v_stage.stage_type not in ('single_elimination','double_elimination','playoff','final','custom') then
    raise exception using errcode='22023', message='bracket_stage_incompatible';
  end if;
  if v_stage.stage_type in ('single_elimination','double_elimination')
    and p_payload->>'bracket_type' is distinct from v_stage.stage_type then
    raise exception using errcode='22023',message='bracket_type_mismatch';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload - array['bracket_type','section','round','position']::text[] <> '{}'::jsonb then
    raise exception using errcode='22023', message='bracket_input_invalid';
  end if;
  update public.tournament_stages set bracket_type = coalesce(nullif(p_payload->>'bracket_type',''),
    case when stage_type in ('single_elimination','double_elimination') then stage_type else bracket_type end)
  where id=v_stage.id;
  update public.tournament_matches set bracket_section=nullif(p_payload->>'section',''),
    bracket_round=nullif(p_payload->>'round','')::integer,
    bracket_position=nullif(p_payload->>'position','')::integer
  where id=v_match.id returning * into v_match;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'bracket_position_assigned',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('match_id',v_match.id,'stage_id',v_match.stage_id,'section',v_match.bracket_section,
      'round',v_match.bracket_round,'position',v_match.bracket_position,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return public.match_result_json(v_match);
exception when unique_violation then raise exception using errcode='23505', message='bracket_position_conflict';
end; $$;

create or replace function public.create_tournament_bracket_link(
  p_submission_id uuid, p_payload jsonb, p_actor_type text, p_actor_id uuid, p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_link public.tournament_bracket_links; v_constraint text;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload - array['stage_id','source_match_id','outcome','target_match_id','target_slot']::text[] <> '{}'::jsonb then
    raise exception using errcode='22023', message='bracket_input_invalid';
  end if;
  if not exists(select 1 from public.tournament_stages where id=(p_payload->>'stage_id')::uuid
    and submission_id=p_submission_id and stage_type in ('single_elimination','double_elimination','playoff','final','custom')
    and (stage_type<>'custom' or bracket_type is not null)) then
    raise exception using errcode='22023',message='bracket_stage_incompatible';
  end if;
  insert into public.tournament_bracket_links(submission_id,stage_id,source_match_id,outcome,target_match_id,target_slot)
  values(p_submission_id,(p_payload->>'stage_id')::uuid,(p_payload->>'source_match_id')::uuid,p_payload->>'outcome',
    (p_payload->>'target_match_id')::uuid,p_payload->>'target_slot') returning * into v_link;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'bracket_link_created',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    (to_jsonb(v_link)-'submission_id')||jsonb_build_object('operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  if exists(select 1 from public.tournament_matches where id=v_link.source_match_id and status in ('completed','walkover')) then
    perform public.perform_bracket_advancement(v_link.source_match_id);
  end if;
  return to_jsonb(v_link);
exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  if v_constraint='tournament_bracket_links_source_outcome_key' then
    raise exception using errcode='23505', message='bracket_outcome_already_linked';
  end if;
  raise exception using errcode='23505', message='bracket_target_slot_occupied';
end; $$;

create or replace function public.delete_tournament_bracket_link(
  p_submission_id uuid, p_link_id uuid, p_expected_updated_at timestamptz,
  p_actor_type text, p_actor_id uuid, p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_link public.tournament_bracket_links;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  delete from public.tournament_bracket_links where id=p_link_id and submission_id=p_submission_id and updated_at=p_expected_updated_at returning * into v_link;
  if not found then raise exception using errcode='40001', message='bracket_stale_update'; end if;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'bracket_link_deleted',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,jsonb_build_object('link_id',v_link.id,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return jsonb_build_object('id',v_link.id,'deleted',true);
end; $$;

create or replace function public.advance_tournament_bracket_outcome(
  p_submission_id uuid, p_match_id uuid, p_actor_type text, p_actor_id uuid, p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if not exists(select 1 from public.tournament_matches where id=p_match_id and submission_id=p_submission_id) then
    raise exception using errcode='P0002', message='bracket_match_not_found';
  end if;
  return public.perform_bracket_advancement(p_match_id);
end; $$;

create or replace function public.update_stage_standings_config(
  p_submission_id uuid, p_stage_id uuid, p_expected_updated_at timestamptz,
  p_payload jsonb, p_actor_type text, p_actor_id uuid, p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_stage public.tournament_stages; v_config public.tournament_stage_standings_config; v_existed boolean;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  select * into v_stage from public.tournament_stages where id=p_stage_id and submission_id=p_submission_id;
  if not found or v_stage.stage_type not in ('qualifier','group_stage','round_robin','custom') then
    raise exception using errcode='22023', message='standings_stage_incompatible';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload-array['enabled','points_for_win','points_for_loss','points_for_walkover','score_difference_enabled','qualification_places','calculation_mode']::text[]<>'{}'::jsonb then
    raise exception using errcode='22023', message='standings_input_invalid';
  end if;
  select * into v_config from public.tournament_stage_standings_config where stage_id=p_stage_id for update;
  v_existed := found;
  if v_existed and (p_expected_updated_at is null or v_config.updated_at<>p_expected_updated_at) then
    raise exception using errcode='40001', message='standings_stale_update';
  end if;
  insert into public.tournament_stage_standings_config(stage_id,submission_id,enabled,points_for_win,points_for_loss,points_for_walkover,score_difference_enabled,qualification_places,calculation_mode)
  values(p_stage_id,p_submission_id,coalesce((p_payload->>'enabled')::boolean,true),coalesce((p_payload->>'points_for_win')::integer,3),
    coalesce((p_payload->>'points_for_loss')::integer,0),coalesce((p_payload->>'points_for_walkover')::integer,3),
    coalesce((p_payload->>'score_difference_enabled')::boolean,true),(p_payload->>'qualification_places')::integer,
    coalesce(nullif(p_payload->>'calculation_mode',''),'automatic'))
  on conflict(stage_id) do update set enabled=excluded.enabled,points_for_win=excluded.points_for_win,
    points_for_loss=excluded.points_for_loss,points_for_walkover=excluded.points_for_walkover,
    score_difference_enabled=excluded.score_difference_enabled,qualification_places=excluded.qualification_places,
    calculation_mode=excluded.calculation_mode returning * into v_config;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'standings_config_updated',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,jsonb_build_object('stage_id',p_stage_id,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  if not v_existed and v_config.enabled then
    insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
    values(p_submission_id,'standings_enabled',case when p_actor_type='admin' then 'admin' else 'organizer' end,
      case when p_actor_type='admin' then p_actor_id else null end,
      jsonb_build_object('stage_id',p_stage_id,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  end if;
  return to_jsonb(v_config);
end; $$;

create or replace function public.assign_team_to_stage_group(
  p_submission_id uuid,p_stage_id uuid,p_team_id uuid,p_group_name text,p_sequence_number integer,
  p_actor_type text,p_actor_id uuid,p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_row public.tournament_stage_group_teams;
begin perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if not exists(select 1 from public.tournament_stages s where s.id=p_stage_id and s.submission_id=p_submission_id
    and s.stage_type in ('qualifier','group_stage','round_robin','custom')
    and (s.stage_type<>'custom' or exists(select 1 from public.tournament_stage_standings_config c where c.stage_id=s.id and c.enabled))) then
    raise exception using errcode='22023',message='standings_stage_incompatible'; end if;
  select * into v_row from public.tournament_stage_group_teams where stage_id=p_stage_id and team_id=p_team_id for update;
  if found then
    if v_row.group_name=btrim(p_group_name) then return to_jsonb(v_row); end if;
    raise exception using errcode='23505',message='standings_group_conflict';
  end if;
  insert into public.tournament_stage_group_teams(submission_id,stage_id,team_id,group_name,sequence_number)
  values(p_submission_id,p_stage_id,p_team_id,btrim(p_group_name),p_sequence_number)
  returning * into v_row;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'standings_team_assigned',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,jsonb_build_object('stage_id',p_stage_id,'team_id',p_team_id,'group_name',v_row.group_name,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return to_jsonb(v_row); end; $$;

create or replace function public.remove_team_from_stage_group(
  p_submission_id uuid,p_assignment_id uuid,p_expected_updated_at timestamptz,
  p_actor_type text,p_actor_id uuid,p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_row public.tournament_stage_group_teams;
begin perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  delete from public.tournament_stage_group_teams where id=p_assignment_id and submission_id=p_submission_id and updated_at=p_expected_updated_at returning * into v_row;
  if not found then raise exception using errcode='40001',message='standings_stale_update'; end if;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'standings_team_removed',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,jsonb_build_object('assignment_id',v_row.id,'stage_id',v_row.stage_id,'team_id',v_row.team_id,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return jsonb_build_object('id',v_row.id,'deleted',true); end; $$;

create or replace function public.upsert_standing_adjustment(
  p_submission_id uuid,p_stage_id uuid,p_team_id uuid,p_expected_updated_at timestamptz,p_payload jsonb,
  p_actor_type text,p_actor_id uuid,p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_row public.tournament_standing_adjustments; v_existed boolean;
begin perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if not exists(select 1 from public.tournament_stages s where s.id=p_stage_id and s.submission_id=p_submission_id
    and s.stage_type in ('qualifier','group_stage','round_robin','custom')
    and (s.stage_type<>'custom' or exists(select 1 from public.tournament_stage_standings_config c where c.stage_id=s.id and c.enabled))) then
    raise exception using errcode='22023',message='standings_stage_incompatible'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload-array['points_adjustment','rank_override','qualified_override','public_note']::text[]<>'{}'::jsonb then
    raise exception using errcode='22023',message='standings_input_invalid'; end if;
  select * into v_row from public.tournament_standing_adjustments where stage_id=p_stage_id and team_id=p_team_id for update;
  v_existed := found;
  if v_existed and (p_expected_updated_at is null or v_row.updated_at<>p_expected_updated_at) then raise exception using errcode='40001',message='standings_stale_update'; end if;
  insert into public.tournament_standing_adjustments(submission_id,stage_id,team_id,points_adjustment,rank_override,qualified_override,public_note)
  values(p_submission_id,p_stage_id,p_team_id,coalesce((p_payload->>'points_adjustment')::integer,0),(p_payload->>'rank_override')::integer,
    (p_payload->>'qualified_override')::boolean,nullif(btrim(p_payload->>'public_note'),''))
  on conflict(stage_id,team_id) do update set points_adjustment=excluded.points_adjustment,rank_override=excluded.rank_override,
    qualified_override=excluded.qualified_override,public_note=excluded.public_note returning * into v_row;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,case when v_existed then 'standings_adjustment_updated' else 'standings_adjustment_created' end,
    case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,jsonb_build_object('adjustment_id',v_row.id,'stage_id',p_stage_id,'team_id',p_team_id,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return to_jsonb(v_row); end; $$;

create or replace function public.delete_standing_adjustment(
  p_submission_id uuid,p_adjustment_id uuid,p_expected_updated_at timestamptz,
  p_actor_type text,p_actor_id uuid,p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_row public.tournament_standing_adjustments;
begin perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  delete from public.tournament_standing_adjustments where id=p_adjustment_id and submission_id=p_submission_id and updated_at=p_expected_updated_at returning * into v_row;
  if not found then raise exception using errcode='40001',message='standings_stale_update'; end if;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'standings_adjustment_deleted',case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,jsonb_build_object('adjustment_id',v_row.id,'stage_id',v_row.stage_id,'team_id',v_row.team_id,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return jsonb_build_object('id',v_row.id,'deleted',true); end; $$;

create or replace function public.get_tournament_stage_standings(p_submission_id uuid,p_stage_id uuid)
returns table(team_id uuid,team_name text,team_slug text,seed integer,group_name text,played bigint,wins bigint,losses bigint,
  score_for bigint,score_against bigint,score_diff bigint,points bigint,rank_override integer,rank bigint,qualified boolean,public_note text)
language sql stable security definer set search_path = pg_catalog, public as $$
  with config as (
    select * from public.tournament_stage_standings_config where submission_id=p_submission_id and stage_id=p_stage_id and enabled
  ), assigned as (
    select gt.team_id,gt.group_name from public.tournament_stage_group_teams gt where gt.submission_id=p_submission_id and gt.stage_id=p_stage_id
  ), participants as (
    select team_id,group_name from assigned
    union
    select m.team_a_id,coalesce(m.group_name,'default') from public.tournament_matches m where m.submission_id=p_submission_id and m.stage_id=p_stage_id and m.team_a_id is not null
      and not exists(select 1 from assigned a where a.team_id=m.team_a_id)
    union
    select m.team_b_id,coalesce(m.group_name,'default') from public.tournament_matches m where m.submission_id=p_submission_id and m.stage_id=p_stage_id and m.team_b_id is not null
      and not exists(select 1 from assigned a where a.team_id=m.team_b_id)
  ), games as (
    select m.team_a_id as team_id,m.group_name,m.score_a as sf,m.score_b as sa,(m.winner_team_id=m.team_a_id) as won,m.status
    from public.tournament_matches m where m.submission_id=p_submission_id and m.stage_id=p_stage_id and m.status in('completed','walkover') and m.team_a_id is not null
    union all
    select m.team_b_id,m.group_name,m.score_b,m.score_a,(m.winner_team_id=m.team_b_id),m.status
    from public.tournament_matches m where m.submission_id=p_submission_id and m.stage_id=p_stage_id and m.status in('completed','walkover') and m.team_b_id is not null
  ), totals as (
    select p.team_id,p.group_name,count(g.team_id) played,count(g.team_id) filter(where g.won) wins,
      count(g.team_id) filter(where g.won and g.status='walkover') walkover_wins,count(g.team_id) filter(where not g.won) losses,
      coalesce(sum(g.sf),0) score_for,coalesce(sum(g.sa),0) score_against
    from participants p left join games g on g.team_id=p.team_id and coalesce(g.group_name,'default')=p.group_name group by p.team_id,p.group_name
  ), scored as (
    select t.*,tm.name,tm.slug,tm.seed,a.rank_override,
      ((t.wins-t.walkover_wins)*c.points_for_win+t.walkover_wins*c.points_for_walkover+
        t.losses*c.points_for_loss+coalesce(a.points_adjustment,0))::bigint points,c.qualification_places,
      c.score_difference_enabled,a.qualified_override,a.public_note
    from totals t join public.tournament_teams tm on tm.id=t.team_id cross join config c
    left join public.tournament_standing_adjustments a on a.stage_id=p_stage_id and a.team_id=t.team_id
  ), ranked as (
    select s.*,row_number() over(partition by s.group_name order by s.rank_override asc nulls last,s.points desc,s.wins desc,
      (case when s.score_difference_enabled then s.score_for-s.score_against else 0 end) desc,
      s.score_for desc,s.seed asc nulls last,s.name asc) calculated_rank from scored s
  ) select team_id,name,slug,seed,group_name,played,wins,losses,score_for,score_against,(score_for-score_against),points,rank_override,
    coalesce(rank_override,calculated_rank)::bigint,
    coalesce(qualified_override,coalesce(coalesce(rank_override,calculated_rank)<=qualification_places,false)),public_note
  from ranked order by group_name,rank_override asc nulls last,points desc,wins desc,
    (case when score_difference_enabled then score_for-score_against else 0 end) desc,
    score_for desc,seed asc nulls last,name asc;
$$;

alter table public.tournament_bracket_links enable row level security;
alter table public.tournament_stage_standings_config enable row level security;
alter table public.tournament_stage_group_teams enable row level security;
alter table public.tournament_standing_adjustments enable row level security;
revoke all on public.tournament_bracket_links,public.tournament_stage_standings_config,
  public.tournament_stage_group_teams,public.tournament_standing_adjustments from public,anon,authenticated;
grant select,insert,update,delete on public.tournament_bracket_links,public.tournament_stage_standings_config,
  public.tournament_stage_group_teams,public.tournament_standing_adjustments to service_role;

revoke all on function public.validate_bracket_standings_scope(),public.assert_bracket_link_acyclic(),
  public.perform_bracket_advancement(uuid),public.advance_bracket_after_result(),
  public.assign_match_bracket_position(uuid,uuid,timestamptz,jsonb,text,uuid,uuid),
  public.create_tournament_bracket_link(uuid,jsonb,text,uuid,uuid),
  public.delete_tournament_bracket_link(uuid,uuid,timestamptz,text,uuid,uuid),
  public.advance_tournament_bracket_outcome(uuid,uuid,text,uuid,uuid),
  public.update_stage_standings_config(uuid,uuid,timestamptz,jsonb,text,uuid,uuid),
  public.assign_team_to_stage_group(uuid,uuid,uuid,text,integer,text,uuid,uuid),
  public.remove_team_from_stage_group(uuid,uuid,timestamptz,text,uuid,uuid),
  public.upsert_standing_adjustment(uuid,uuid,uuid,timestamptz,jsonb,text,uuid,uuid),
  public.delete_standing_adjustment(uuid,uuid,timestamptz,text,uuid,uuid),
  public.get_tournament_stage_standings(uuid,uuid) from public,anon,authenticated;

grant execute on function public.assign_match_bracket_position(uuid,uuid,timestamptz,jsonb,text,uuid,uuid),
  public.create_tournament_bracket_link(uuid,jsonb,text,uuid,uuid),
  public.delete_tournament_bracket_link(uuid,uuid,timestamptz,text,uuid,uuid),
  public.advance_tournament_bracket_outcome(uuid,uuid,text,uuid,uuid),
  public.update_stage_standings_config(uuid,uuid,timestamptz,jsonb,text,uuid,uuid),
  public.assign_team_to_stage_group(uuid,uuid,uuid,text,integer,text,uuid,uuid),
  public.remove_team_from_stage_group(uuid,uuid,timestamptz,text,uuid,uuid),
  public.upsert_standing_adjustment(uuid,uuid,uuid,timestamptz,jsonb,text,uuid,uuid),
  public.delete_standing_adjustment(uuid,uuid,timestamptz,text,uuid,uuid),
  public.get_tournament_stage_standings(uuid,uuid) to service_role;
