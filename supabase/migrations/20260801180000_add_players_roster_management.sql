alter table public.tournament_roster_members
  add constraint tournament_roster_captain_role_check
  check (not is_captain or role = 'player');

create unique index tournament_roster_one_active_captain_idx
  on public.tournament_roster_members(tournament_team_id)
  where is_active and is_captain;

create or replace function public.roster_safe_member(p_membership_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', m.id,
    'tournament_team_id', m.tournament_team_id,
    'player_id', m.player_id,
    'role', m.role,
    'is_captain', m.is_captain,
    'is_active', m.is_active,
    'joined_at', m.joined_at,
    'left_at', m.left_at,
    'updated_at', m.updated_at,
    'player', jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'country_code', p.country_code,
      'steam_id', p.steam_id,
      'deadlock_account_id', p.deadlock_account_id,
      'updated_at', p.updated_at
    )
  )
  from public.tournament_roster_members m
  join public.players p on p.id = m.player_id
  where m.id = p_membership_id;
$$;

create or replace function public.search_players_for_roster(
  p_submission_id uuid,
  p_query text,
  p_actor_type text,
  p_actor_id uuid,
  p_workspace_token_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_query text := btrim(p_query);
begin
  perform public.assert_operational_mutation_access(
    p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id
  );
  if char_length(v_query) < 2 or char_length(v_query) > 100 then
    raise exception using errcode = '22023', message = 'player_search_invalid';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', result.id,
      'display_name', result.display_name,
      'country_code', result.country_code,
      'steam_id', result.steam_id,
      'deadlock_account_id', result.deadlock_account_id,
      'updated_at', result.updated_at
    ) order by result.normalized_name, result.display_name, result.id)
    from (
      select p.id, p.display_name, p.normalized_name, p.country_code,
        p.steam_id, p.deadlock_account_id, p.updated_at
      from public.players p
      where p.display_name ilike '%' || v_query || '%'
        or p.normalized_name ilike '%' || lower(v_query) || '%'
        or p.steam_id = v_query
        or p.deadlock_account_id = v_query
      order by p.normalized_name, p.display_name, p.id
      limit 20
    ) result
  ), '[]'::jsonb);
end;
$$;

create or replace function public.create_player_and_add_to_roster(
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
  v_player public.players;
  v_member public.tournament_roster_members;
  v_new jsonb;
  v_role text;
  v_previous_captain uuid;
begin
  perform public.assert_operational_mutation_access(p_submission_id, p_actor_type, p_actor_id, p_workspace_token_id);
  if jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload - array['tournament_team_id','role','is_captain','joined_at','new_player','confirm_same_name']::text[] <> '{}'::jsonb
    or jsonb_typeof(p_payload -> 'new_player') is distinct from 'object'
    or (p_payload -> 'new_player') - array['display_name','normalized_name','country_code','steam_id','deadlock_account_id']::text[] <> '{}'::jsonb
  then raise exception using errcode = '22023', message = 'roster_input_invalid'; end if;
  select * into v_team from public.tournament_teams
    where id = (p_payload ->> 'tournament_team_id')::uuid and submission_id = p_submission_id for update;
  if not found then raise exception using errcode = '42501', message = 'roster_access_denied'; end if;
  v_new := p_payload -> 'new_player';
  v_role := p_payload ->> 'role';
  if v_role not in ('player','substitute','coach','manager')
    or coalesce((p_payload ->> 'is_captain')::boolean, false) and v_role <> 'player'
  then raise exception using errcode = '22023', message = 'captain_role_invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(v_new ->> 'normalized_name',''), 21));
  if nullif(btrim(v_new ->> 'steam_id'), '') is not null and exists (
    select 1 from public.players where steam_id = btrim(v_new ->> 'steam_id')
  ) or nullif(btrim(v_new ->> 'deadlock_account_id'), '') is not null and exists (
    select 1 from public.players where deadlock_account_id = btrim(v_new ->> 'deadlock_account_id')
  ) then raise exception using errcode = '23505', message = 'platform_id_conflict'; end if;
  if not coalesce((p_payload ->> 'confirm_same_name')::boolean, false) and exists (
    select 1 from public.players where normalized_name = btrim(v_new ->> 'normalized_name')
  ) then raise exception using errcode = 'P0001', message = 'same_name_confirmation_required'; end if;
  insert into public.players(display_name, normalized_name, country_code, steam_id, deadlock_account_id, source, is_public)
  values (btrim(v_new ->> 'display_name'), btrim(v_new ->> 'normalized_name'),
    nullif(upper(btrim(v_new ->> 'country_code')), ''), nullif(btrim(v_new ->> 'steam_id'), ''),
    nullif(btrim(v_new ->> 'deadlock_account_id'), ''), 'manual', true)
  returning * into v_player;
  if coalesce((p_payload ->> 'is_captain')::boolean, false) then
    select player_id into v_previous_captain from public.tournament_roster_members
      where tournament_team_id = v_team.id and is_active and is_captain for update;
    update public.tournament_roster_members set is_captain = false
      where tournament_team_id = v_team.id and is_active and is_captain;
  end if;
  insert into public.tournament_roster_members(tournament_team_id, player_id, role, is_captain, is_active, joined_at)
  values (v_team.id, v_player.id, v_role, coalesce((p_payload ->> 'is_captain')::boolean, false), true,
    coalesce((p_payload ->> 'joined_at')::timestamptz, now())) returning * into v_member;
  insert into public.submission_events(submission_id,event_type,from_status,to_status,actor_type,actor_id,metadata)
  values (p_submission_id,'player_created',null,null,case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('player_id',v_player.id,'display_name',v_player.display_name,'operational_version','v1') || public.operational_actor_metadata(p_actor_type)),
  (p_submission_id,'roster_member_added',null,null,case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('membership_id',v_member.id,'player_id',v_player.id,'team_id',v_team.id,'display_name',v_player.display_name,'role',v_member.role,'operational_version','v1') || public.operational_actor_metadata(p_actor_type));
  if v_member.is_captain then
    insert into public.submission_events(submission_id,event_type,from_status,to_status,actor_type,actor_id,metadata)
    values (p_submission_id,'roster_captain_changed',null,null,case when p_actor_type='admin' then 'admin' else 'organizer' end,
      case when p_actor_type='admin' then p_actor_id else null end,
      jsonb_build_object('team_id',v_team.id,'previous_captain_player_id',v_previous_captain,'new_captain_player_id',v_player.id,'operational_version','v1') || public.operational_actor_metadata(p_actor_type));
  end if;
  return public.roster_safe_member(v_member.id);
exception when unique_violation then raise exception using errcode = '23505', message = 'platform_id_conflict';
end;
$$;

create or replace function public.add_existing_player_to_roster(
  p_submission_id uuid, p_payload jsonb, p_actor_type text, p_actor_id uuid, p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_team public.tournament_teams; v_player public.players; v_member public.tournament_roster_members; v_role text; v_previous uuid;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload - array['tournament_team_id','player_id','role','is_captain','joined_at']::text[] <> '{}'::jsonb
  then raise exception using errcode='22023',message='roster_input_invalid'; end if;
  select * into v_team from public.tournament_teams where id=(p_payload->>'tournament_team_id')::uuid and submission_id=p_submission_id for update;
  if not found then raise exception using errcode='42501',message='roster_access_denied'; end if;
  select * into v_player from public.players where id=(p_payload->>'player_id')::uuid;
  if not found then raise exception using errcode='22023',message='player_not_found'; end if;
  v_role:=p_payload->>'role';
  if v_role not in ('player','substitute','coach','manager') or coalesce((p_payload->>'is_captain')::boolean,false) and v_role<>'player'
  then raise exception using errcode='22023',message='captain_role_invalid'; end if;
  if coalesce((p_payload->>'is_captain')::boolean,false) then
    select player_id into v_previous from public.tournament_roster_members where tournament_team_id=v_team.id and is_active and is_captain for update;
    update public.tournament_roster_members set is_captain=false where tournament_team_id=v_team.id and is_active and is_captain;
  end if;
  insert into public.tournament_roster_members(tournament_team_id,player_id,role,is_captain,is_active,joined_at)
  values(v_team.id,v_player.id,v_role,coalesce((p_payload->>'is_captain')::boolean,false),true,coalesce((p_payload->>'joined_at')::timestamptz,now())) returning * into v_member;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'roster_member_added',case when p_actor_type='admin' then 'admin' else 'organizer' end,case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('membership_id',v_member.id,'player_id',v_player.id,'team_id',v_team.id,'display_name',v_player.display_name,'role',v_member.role,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  if v_member.is_captain then insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
    values(p_submission_id,'roster_captain_changed',case when p_actor_type='admin' then 'admin' else 'organizer' end,case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('team_id',v_team.id,'previous_captain_player_id',v_previous,'new_captain_player_id',v_player.id,'operational_version','v1')||public.operational_actor_metadata(p_actor_type)); end if;
  return public.roster_safe_member(v_member.id);
exception when unique_violation then raise exception using errcode='23505',message='membership_conflict'; end; $$;

create or replace function public.update_player_profile(
  p_submission_id uuid, p_payload jsonb, p_actor_type text, p_actor_id uuid, p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_old public.players; v_player public.players; v_changed jsonb;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload-array['player_id','expected_updated_at','display_name','normalized_name','country_code','steam_id','deadlock_account_id']::text[]<>'{}'::jsonb
  then raise exception using errcode='22023',message='player_input_invalid'; end if;
  select p.* into v_old from public.players p where p.id=(p_payload->>'player_id')::uuid and p.updated_at=(p_payload->>'expected_updated_at')::timestamptz
    and exists(select 1 from public.tournament_roster_members m join public.tournament_teams t on t.id=m.tournament_team_id where m.player_id=p.id and m.is_active and t.submission_id=p_submission_id) for update;
  if not found then raise exception using errcode='40001',message='operational_conflict'; end if;
  update public.players set display_name=btrim(p_payload->>'display_name'), normalized_name=btrim(p_payload->>'normalized_name'),
    country_code=nullif(upper(btrim(p_payload->>'country_code')),''), steam_id=nullif(btrim(p_payload->>'steam_id'),''), deadlock_account_id=nullif(btrim(p_payload->>'deadlock_account_id'),'')
    where id=v_old.id returning * into v_player;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_changed from unnest(array['display_name','country_code','steam_id','deadlock_account_id']) x
    where to_jsonb(v_old)->x is distinct from to_jsonb(v_player)->x;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'player_profile_updated',case when p_actor_type='admin' then 'admin' else 'organizer' end,case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('player_id',v_player.id,'changed_fields',v_changed,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  return jsonb_build_object('id',v_player.id,'display_name',v_player.display_name,'country_code',v_player.country_code,'steam_id',v_player.steam_id,'deadlock_account_id',v_player.deadlock_account_id,'updated_at',v_player.updated_at);
exception when unique_violation then raise exception using errcode='23505',message='platform_id_conflict'; end; $$;

create or replace function public.update_roster_membership(
  p_submission_id uuid, p_payload jsonb, p_actor_type text, p_actor_id uuid, p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_old public.tournament_roster_members; v_member public.tournament_roster_members; v_team public.tournament_teams; v_player public.players; v_previous uuid; v_changed jsonb;
begin
  perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload-array['tournament_team_id','membership_id','expected_updated_at','role','is_captain']::text[]<>'{}'::jsonb
  then raise exception using errcode='22023',message='roster_input_invalid'; end if;
  select m.* into v_old from public.tournament_roster_members m join public.tournament_teams t on t.id=m.tournament_team_id
    where m.id=(p_payload->>'membership_id')::uuid and m.tournament_team_id=(p_payload->>'tournament_team_id')::uuid and m.is_active
      and m.updated_at=(p_payload->>'expected_updated_at')::timestamptz and t.submission_id=p_submission_id for update of m;
  if not found then raise exception using errcode='40001',message='operational_conflict'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_old.tournament_team_id::text, 22));
  if coalesce((p_payload->>'is_captain')::boolean,false) and p_payload->>'role'<>'player'
  then raise exception using errcode='22023',message='captain_role_invalid'; end if;
  if coalesce((p_payload->>'is_captain')::boolean,false) then
    select player_id into v_previous from public.tournament_roster_members where tournament_team_id=v_old.tournament_team_id and id<>v_old.id and is_active and is_captain for update;
    update public.tournament_roster_members set is_captain=false where tournament_team_id=v_old.tournament_team_id and id<>v_old.id and is_active and is_captain;
  end if;
  update public.tournament_roster_members set role=p_payload->>'role',is_captain=(p_payload->>'is_captain')::boolean
    where id=v_old.id returning * into v_member;
  select * into v_team from public.tournament_teams where id=v_member.tournament_team_id; select * into v_player from public.players where id=v_member.player_id;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_changed from unnest(array['role','is_captain']) x where to_jsonb(v_old)->x is distinct from to_jsonb(v_member)->x;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata) values(p_submission_id,'roster_member_updated',case when p_actor_type='admin' then 'admin' else 'organizer' end,case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('membership_id',v_member.id,'changed_fields',v_changed,'operational_version','v1')||public.operational_actor_metadata(p_actor_type));
  if v_member.is_captain and (not v_old.is_captain or v_previous is not null) then insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
    values(p_submission_id,'roster_captain_changed',case when p_actor_type='admin' then 'admin' else 'organizer' end,case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('team_id',v_team.id,'previous_captain_player_id',v_previous,'new_captain_player_id',v_player.id,'operational_version','v1')||public.operational_actor_metadata(p_actor_type)); end if;
  return public.roster_safe_member(v_member.id);
exception when unique_violation then raise exception using errcode='23505',message='membership_conflict'; end; $$;

create or replace function public.remove_roster_member(
  p_submission_id uuid,p_payload jsonb,p_actor_type text,p_actor_id uuid,p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_member public.tournament_roster_members; v_team public.tournament_teams; v_player public.players;
begin perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload-array['tournament_team_id','membership_id','expected_updated_at']::text[]<>'{}'::jsonb then raise exception using errcode='22023',message='roster_input_invalid'; end if;
  select m.* into v_member from public.tournament_roster_members m join public.tournament_teams t on t.id=m.tournament_team_id where m.id=(p_payload->>'membership_id')::uuid and m.tournament_team_id=(p_payload->>'tournament_team_id')::uuid and m.is_active and m.updated_at=(p_payload->>'expected_updated_at')::timestamptz and t.submission_id=p_submission_id for update of m;
  if not found then raise exception using errcode='40001',message='operational_conflict'; end if;
  update public.tournament_roster_members set is_active=false,is_captain=false,left_at=now() where id=v_member.id returning * into v_member;
  select * into v_team from public.tournament_teams where id=v_member.tournament_team_id; select * into v_player from public.players where id=v_member.player_id;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata) values(p_submission_id,'roster_member_removed',case when p_actor_type='admin' then 'admin' else 'organizer' end,case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('membership_id',v_member.id,'player_id',v_player.id,'team_id',v_team.id,'display_name',v_player.display_name,'operational_version','v1')||public.operational_actor_metadata(p_actor_type)); return public.roster_safe_member(v_member.id); end; $$;

create or replace function public.restore_roster_member(
  p_submission_id uuid,p_payload jsonb,p_actor_type text,p_actor_id uuid,p_workspace_token_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_member public.tournament_roster_members; v_team public.tournament_teams; v_player public.players;
begin perform public.assert_operational_mutation_access(p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id);
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload-array['tournament_team_id','membership_id','expected_updated_at','role']::text[]<>'{}'::jsonb then raise exception using errcode='22023',message='roster_input_invalid'; end if;
  select m.* into v_member from public.tournament_roster_members m join public.tournament_teams t on t.id=m.tournament_team_id where m.id=(p_payload->>'membership_id')::uuid and m.tournament_team_id=(p_payload->>'tournament_team_id')::uuid and not m.is_active and m.updated_at=(p_payload->>'expected_updated_at')::timestamptz and t.submission_id=p_submission_id for update of m;
  if not found then raise exception using errcode='40001',message='operational_conflict'; end if;
  update public.tournament_roster_members set is_active=true,is_captain=false,left_at=null,role=p_payload->>'role' where id=v_member.id returning * into v_member;
  select * into v_team from public.tournament_teams where id=v_member.tournament_team_id; select * into v_player from public.players where id=v_member.player_id;
  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata) values(p_submission_id,'roster_member_restored',case when p_actor_type='admin' then 'admin' else 'organizer' end,case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('membership_id',v_member.id,'player_id',v_player.id,'team_id',v_team.id,'display_name',v_player.display_name,'operational_version','v1')||public.operational_actor_metadata(p_actor_type)); return public.roster_safe_member(v_member.id);
exception when unique_violation then raise exception using errcode='23505',message='membership_conflict'; end; $$;

revoke all on function public.roster_safe_member(uuid) from public,anon,authenticated;
revoke all on function public.search_players_for_roster(uuid,text,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.create_player_and_add_to_roster(uuid,jsonb,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.add_existing_player_to_roster(uuid,jsonb,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.update_player_profile(uuid,jsonb,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.update_roster_membership(uuid,jsonb,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.remove_roster_member(uuid,jsonb,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.restore_roster_member(uuid,jsonb,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.search_players_for_roster(uuid,text,text,uuid,uuid) to service_role;
grant execute on function public.create_player_and_add_to_roster(uuid,jsonb,text,uuid,uuid) to service_role;
grant execute on function public.add_existing_player_to_roster(uuid,jsonb,text,uuid,uuid) to service_role;
grant execute on function public.update_player_profile(uuid,jsonb,text,uuid,uuid) to service_role;
grant execute on function public.update_roster_membership(uuid,jsonb,text,uuid,uuid) to service_role;
grant execute on function public.remove_roster_member(uuid,jsonb,text,uuid,uuid) to service_role;
grant execute on function public.restore_roster_member(uuid,jsonb,text,uuid,uuid) to service_role;
