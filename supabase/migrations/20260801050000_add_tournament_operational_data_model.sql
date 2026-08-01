-- Organizer Workspace v1 operational model. These tables are intentionally
-- private and remain rooted in the existing submission workflow.

create table public.tournament_stages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null
    references public.tournament_submissions(id) on delete cascade,
  name text not null,
  slug text not null,
  stage_type text not null,
  sequence_number integer not null,
  start_at timestamptz null,
  end_at timestamptz null,
  timezone text null,
  format_text text null,
  best_of_default integer null,
  team_count integer null,
  is_online boolean null,
  location_name text null,
  status text not null default 'scheduled',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_stages_submission_slug_key
    unique (submission_id, slug),
  constraint tournament_stages_submission_sequence_key
    unique (submission_id, sequence_number),
  constraint tournament_stages_name_not_blank check (btrim(name) <> ''),
  constraint tournament_stages_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tournament_stages_type_allowed check (
    stage_type in (
      'qualifier', 'group_stage', 'swiss', 'single_elimination',
      'double_elimination', 'round_robin', 'playoff', 'final', 'custom'
    )
  ),
  constraint tournament_stages_status_allowed check (
    status in ('scheduled', 'live', 'completed', 'cancelled')
  ),
  constraint tournament_stages_sequence_positive check (sequence_number > 0),
  constraint tournament_stages_team_count_positive
    check (team_count is null or team_count > 0),
  constraint tournament_stages_best_of_positive_odd check (
    best_of_default is null
    or (best_of_default > 0 and best_of_default % 2 = 1)
  ),
  constraint tournament_stages_date_order check (
    end_at is null
    or (start_at is not null and end_at >= start_at)
  )
);

create table public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null
    references public.tournament_submissions(id) on delete cascade,
  name text not null,
  short_name text null,
  slug text not null,
  logo_url text null,
  region text null,
  seed integer null,
  status text not null default 'active',
  external_team_id text null,
  source text not null default 'manual',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_teams_submission_slug_key unique (submission_id, slug),
  constraint tournament_teams_name_not_blank check (btrim(name) <> ''),
  constraint tournament_teams_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tournament_teams_seed_positive check (seed is null or seed > 0),
  constraint tournament_teams_status_allowed check (
    status in (
      'invited', 'registered', 'confirmed', 'active', 'eliminated',
      'withdrawn', 'disqualified'
    )
  ),
  constraint tournament_teams_source_allowed
    check (source in ('manual', 'import', 'api'))
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  normalized_name text not null,
  real_name text null,
  country_code text null,
  steam_id text null,
  deadlock_account_id text null,
  external_player_id text null,
  source text not null default 'manual',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_display_name_not_blank check (btrim(display_name) <> ''),
  constraint players_normalized_name_not_blank
    check (btrim(normalized_name) <> ''),
  constraint players_country_code_format
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint players_source_allowed check (source in ('manual', 'import', 'api'))
);

create table public.tournament_roster_members (
  id uuid primary key default gen_random_uuid(),
  tournament_team_id uuid not null
    references public.tournament_teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  role text not null default 'player',
  is_captain boolean not null default false,
  is_active boolean not null default true,
  joined_at timestamptz null,
  left_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_roster_team_player_role_key
    unique (tournament_team_id, player_id, role),
  constraint tournament_roster_role_allowed
    check (role in ('player', 'substitute', 'coach', 'manager')),
  constraint tournament_roster_date_order check (
    left_at is null
    or (joined_at is not null and left_at >= joined_at)
  )
);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null
    references public.tournament_submissions(id) on delete cascade,
  stage_id uuid null references public.tournament_stages(id) on delete set null,
  match_number integer null,
  round_name text null,
  group_name text null,
  scheduled_at timestamptz null,
  best_of integer null,
  team_a_id uuid null references public.tournament_teams(id) on delete set null,
  team_b_id uuid null references public.tournament_teams(id) on delete set null,
  score_a integer null,
  score_b integer null,
  winner_team_id uuid null
    references public.tournament_teams(id) on delete set null,
  status text not null default 'scheduled',
  deadlock_match_id text null,
  stream_url text null,
  vod_url text null,
  duration_seconds integer null,
  source text not null default 'manual',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_matches_status_allowed check (
    status in (
      'draft', 'scheduled', 'live', 'completed', 'postponed',
      'cancelled', 'walkover'
    )
  ),
  constraint tournament_matches_source_allowed
    check (source in ('manual', 'import', 'api')),
  constraint tournament_matches_best_of_positive_odd
    check (best_of is null or (best_of > 0 and best_of % 2 = 1)),
  constraint tournament_matches_score_a_nonnegative
    check (score_a is null or score_a >= 0),
  constraint tournament_matches_score_b_nonnegative
    check (score_b is null or score_b >= 0),
  constraint tournament_matches_duration_positive
    check (duration_seconds is null or duration_seconds > 0),
  constraint tournament_matches_distinct_teams
    check (team_a_id is null or team_b_id is null or team_a_id <> team_b_id),
  constraint tournament_matches_winner_is_participant check (
    winner_team_id is null
    or (team_a_id is not null and winner_team_id = team_a_id)
    or (team_b_id is not null and winner_team_id = team_b_id)
  ),
  constraint tournament_matches_scheduled_result_empty check (
    status <> 'scheduled'
    or (score_a is null and score_b is null and winner_team_id is null)
  ),
  constraint tournament_matches_live_state check (
    status <> 'live'
    or (team_a_id is not null and team_b_id is not null and winner_team_id is null)
  ),
  constraint tournament_matches_completed_state check (
    status <> 'completed'
    or (
      team_a_id is not null
      and team_b_id is not null
      and score_a is not null
      and score_b is not null
      and score_a <> score_b
      and winner_team_id is not null
      and (
        (score_a > score_b and winner_team_id = team_a_id)
        or (score_b > score_a and winner_team_id = team_b_id)
      )
    )
  ),
  constraint tournament_matches_walkover_winner check (
    status <> 'walkover' or winner_team_id is not null
  )
);

create unique index tournament_matches_submission_stage_number_key
  on public.tournament_matches (
    submission_id,
    coalesce(stage_id, '00000000-0000-0000-0000-000000000000'::uuid),
    match_number
  )
  where match_number is not null;

create or replace function public.prevent_operational_scope_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.submission_id is distinct from old.submission_id then
    raise exception using
      errcode = '23514',
      message = 'operational records cannot move between tournament submissions';
  end if;
  return new;
end;
$$;

create trigger tournament_stages_prevent_scope_change
before update of submission_id on public.tournament_stages
for each row execute function public.prevent_operational_scope_change();
create trigger tournament_teams_prevent_scope_change
before update of submission_id on public.tournament_teams
for each row execute function public.prevent_operational_scope_change();

create or replace function public.validate_tournament_match_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.stage_id is not null and not exists (
    select 1 from public.tournament_stages
    where id = new.stage_id and submission_id = new.submission_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'match stage must belong to the same tournament submission';
  end if;

  if new.team_a_id is not null and not exists (
    select 1 from public.tournament_teams
    where id = new.team_a_id and submission_id = new.submission_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'match team_a must belong to the same tournament submission';
  end if;

  if new.team_b_id is not null and not exists (
    select 1 from public.tournament_teams
    where id = new.team_b_id and submission_id = new.submission_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'match team_b must belong to the same tournament submission';
  end if;

  if new.winner_team_id is not null and not exists (
    select 1 from public.tournament_teams
    where id = new.winner_team_id and submission_id = new.submission_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'match winner must belong to the same tournament submission';
  end if;

  return new;
end;
$$;

create trigger tournament_matches_validate_scope
before insert or update of submission_id, stage_id, team_a_id, team_b_id, winner_team_id
on public.tournament_matches
for each row execute function public.validate_tournament_match_scope();

create trigger tournament_stages_set_updated_at
before update on public.tournament_stages
for each row execute function public.set_updated_at();
create trigger tournament_teams_set_updated_at
before update on public.tournament_teams
for each row execute function public.set_updated_at();
create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();
create trigger tournament_roster_members_set_updated_at
before update on public.tournament_roster_members
for each row execute function public.set_updated_at();
create trigger tournament_matches_set_updated_at
before update on public.tournament_matches
for each row execute function public.set_updated_at();

create index tournament_stages_submission_id_idx
  on public.tournament_stages(submission_id);
create index tournament_stages_status_idx on public.tournament_stages(status);
create index tournament_teams_submission_id_idx
  on public.tournament_teams(submission_id);
create index tournament_teams_lower_name_idx
  on public.tournament_teams(lower(name));
create index tournament_teams_status_idx on public.tournament_teams(status);
create index players_normalized_name_idx on public.players(normalized_name);
create unique index players_steam_id_key
  on public.players(steam_id) where steam_id is not null;
create unique index players_deadlock_account_id_key
  on public.players(deadlock_account_id) where deadlock_account_id is not null;
create index tournament_roster_team_id_idx
  on public.tournament_roster_members(tournament_team_id);
create index tournament_roster_player_id_idx
  on public.tournament_roster_members(player_id);
create index tournament_matches_submission_id_idx
  on public.tournament_matches(submission_id);
create index tournament_matches_stage_id_idx on public.tournament_matches(stage_id);
create index tournament_matches_scheduled_at_idx
  on public.tournament_matches(scheduled_at);
create index tournament_matches_status_idx on public.tournament_matches(status);
create index tournament_matches_team_a_id_idx on public.tournament_matches(team_a_id);
create index tournament_matches_team_b_id_idx on public.tournament_matches(team_b_id);
create index tournament_matches_deadlock_match_id_idx
  on public.tournament_matches(deadlock_match_id);

alter table public.tournament_stages enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.players enable row level security;
alter table public.tournament_roster_members enable row level security;
alter table public.tournament_matches enable row level security;

revoke all on table public.tournament_stages from public, anon, authenticated;
revoke all on table public.tournament_teams from public, anon, authenticated;
revoke all on table public.players from public, anon, authenticated;
revoke all on table public.tournament_roster_members from public, anon, authenticated;
revoke all on table public.tournament_matches from public, anon, authenticated;
revoke all on function public.validate_tournament_match_scope()
  from public, anon, authenticated;
revoke all on function public.prevent_operational_scope_change()
  from public, anon, authenticated;

grant all on table public.tournament_stages to service_role;
grant all on table public.tournament_teams to service_role;
grant all on table public.players to service_role;
grant all on table public.tournament_roster_members to service_role;
grant all on table public.tournament_matches to service_role;
