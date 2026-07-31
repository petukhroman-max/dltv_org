create extension if not exists pgcrypto;

create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  contact_name text not null,
  contact_email text not null,
  discord_username text null,
  website_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizers_organization_name_not_blank
    check (btrim(organization_name) <> ''),
  constraint organizers_contact_name_not_blank
    check (btrim(contact_name) <> ''),
  constraint organizers_contact_email_lowercase
    check (contact_email = lower(contact_email))
);

create table if not exists public.tournament_submissions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id),
  status text not null default 'draft',
  tournament_name text not null,
  description text null,
  region text not null,
  language text null,
  start_date date not null,
  end_date date not null,
  timezone text not null,
  format text null,
  prize_pool_text text null,
  registration_url text null,
  bracket_url text null,
  discord_url text null,
  stream_url text null,
  rules_url text null,
  is_online boolean not null default true,
  max_teams integer null,
  registration_deadline timestamptz null,
  organizer_notes text null,
  reviewer_notes text null,
  submitted_at timestamptz null,
  reviewed_at timestamptz null,
  published_at timestamptz null,
  reviewed_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_submissions_status_allowed
    check (
      status in (
        'draft',
        'submitted',
        'needs_changes',
        'approved',
        'published',
        'rejected'
      )
    ),
  constraint tournament_submissions_name_not_blank
    check (btrim(tournament_name) <> ''),
  constraint tournament_submissions_region_not_blank
    check (btrim(region) <> ''),
  constraint tournament_submissions_timezone_not_blank
    check (btrim(timezone) <> ''),
  constraint tournament_submissions_date_order
    check (end_date >= start_date),
  constraint tournament_submissions_max_teams_positive
    check (max_teams is null or max_teams > 0),
  constraint tournament_submissions_published_at_status
    check (published_at is null or status = 'published'),
  constraint tournament_submissions_submitted_at_status
    check (
      status not in (
        'submitted',
        'needs_changes',
        'approved',
        'published',
        'rejected'
      )
      or submitted_at is not null
    ),
  constraint tournament_submissions_reviewed_at_status
    check (
      reviewed_at is null
      or status in ('needs_changes', 'approved', 'published', 'rejected')
    )
);

create table if not exists public.submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null
    references public.tournament_submissions(id) on delete cascade,
  event_type text not null,
  from_status text null,
  to_status text null,
  actor_type text not null,
  actor_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint submission_events_type_not_blank
    check (btrim(event_type) <> ''),
  constraint submission_events_actor_type_allowed
    check (actor_type in ('organizer', 'admin', 'system')),
  constraint submission_events_from_status_allowed
    check (
      from_status is null
      or from_status in (
        'draft',
        'submitted',
        'needs_changes',
        'approved',
        'published',
        'rejected'
      )
    ),
  constraint submission_events_to_status_allowed
    check (
      to_status is null
      or to_status in (
        'draft',
        'submitted',
        'needs_changes',
        'approved',
        'published',
        'rejected'
      )
    )
);

create table if not exists public.admin_users (
  user_id uuid primary key,
  email text not null unique,
  created_at timestamptz not null default now(),
  constraint admin_users_email_lowercase check (email = lower(email))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizers_set_updated_at on public.organizers;
create trigger organizers_set_updated_at
before update on public.organizers
for each row execute function public.set_updated_at();

drop trigger if exists tournament_submissions_set_updated_at
  on public.tournament_submissions;
create trigger tournament_submissions_set_updated_at
before update on public.tournament_submissions
for each row execute function public.set_updated_at();

create index if not exists tournament_submissions_status_idx
  on public.tournament_submissions(status);
create index if not exists tournament_submissions_start_date_idx
  on public.tournament_submissions(start_date);
create index if not exists tournament_submissions_organizer_id_idx
  on public.tournament_submissions(organizer_id);
create index if not exists submission_events_submission_created_idx
  on public.submission_events(submission_id, created_at);
create index if not exists organizers_contact_email_idx
  on public.organizers(contact_email);

alter table public.organizers enable row level security;
alter table public.tournament_submissions enable row level security;
alter table public.submission_events enable row level security;
alter table public.admin_users enable row level security;

revoke all on table public.organizers from anon, authenticated;
revoke all on table public.tournament_submissions from anon, authenticated;
revoke all on table public.submission_events from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;

grant all on table public.organizers to service_role;
grant all on table public.tournament_submissions to service_role;
grant all on table public.submission_events to service_role;
grant all on table public.admin_users to service_role;

create or replace function public.create_tournament_submission_with_organizer(
  p_organizer jsonb,
  p_submission jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_organizer public.organizers;
  v_submission public.tournament_submissions;
begin
  insert into public.organizers (
    organization_name,
    contact_name,
    contact_email,
    discord_username,
    website_url
  )
  values (
    btrim(p_organizer ->> 'organization_name'),
    btrim(p_organizer ->> 'contact_name'),
    lower(btrim(p_organizer ->> 'contact_email')),
    nullif(btrim(p_organizer ->> 'discord_username'), ''),
    nullif(btrim(p_organizer ->> 'website_url'), '')
  )
  returning * into v_organizer;

  insert into public.tournament_submissions (
    organizer_id,
    status,
    tournament_name,
    description,
    region,
    language,
    start_date,
    end_date,
    timezone,
    format,
    prize_pool_text,
    registration_url,
    bracket_url,
    discord_url,
    stream_url,
    rules_url,
    is_online,
    max_teams,
    registration_deadline,
    organizer_notes
  )
  values (
    v_organizer.id,
    'draft',
    btrim(p_submission ->> 'tournament_name'),
    nullif(btrim(p_submission ->> 'description'), ''),
    btrim(p_submission ->> 'region'),
    nullif(btrim(p_submission ->> 'language'), ''),
    (p_submission ->> 'start_date')::date,
    (p_submission ->> 'end_date')::date,
    btrim(p_submission ->> 'timezone'),
    nullif(btrim(p_submission ->> 'format'), ''),
    nullif(btrim(p_submission ->> 'prize_pool_text'), ''),
    nullif(btrim(p_submission ->> 'registration_url'), ''),
    nullif(btrim(p_submission ->> 'bracket_url'), ''),
    nullif(btrim(p_submission ->> 'discord_url'), ''),
    nullif(btrim(p_submission ->> 'stream_url'), ''),
    nullif(btrim(p_submission ->> 'rules_url'), ''),
    coalesce((p_submission ->> 'is_online')::boolean, true),
    (p_submission ->> 'max_teams')::integer,
    (p_submission ->> 'registration_deadline')::timestamptz,
    nullif(btrim(p_submission ->> 'organizer_notes'), '')
  )
  returning * into v_submission;

  insert into public.submission_events (
    submission_id,
    event_type,
    from_status,
    to_status,
    actor_type,
    metadata
  )
  values (
    v_submission.id,
    'submission_created',
    null,
    'draft',
    'system',
    '{}'::jsonb
  );

  return jsonb_build_object(
    'organizer', to_jsonb(v_organizer),
    'submission', to_jsonb(v_submission)
  );
end;
$$;

revoke all on function public.create_tournament_submission_with_organizer(
  jsonb,
  jsonb
) from public, anon, authenticated;
grant execute on function public.create_tournament_submission_with_organizer(
  jsonb,
  jsonb
) to service_role;
