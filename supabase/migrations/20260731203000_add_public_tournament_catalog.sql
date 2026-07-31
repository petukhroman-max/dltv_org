create table public.published_tournaments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique
    references public.tournament_submissions(id),
  slug text not null unique,
  tournament_name text not null,
  description text null,
  organizer_name text not null,
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
  is_online boolean not null,
  max_teams integer null,
  registration_deadline timestamptz null,
  visibility_status text not null default 'published',
  source_updated_at timestamptz not null,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_tournaments_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 100),
  constraint published_tournaments_visibility_allowed
    check (visibility_status in ('published', 'hidden')),
  constraint published_tournaments_name_not_blank
    check (btrim(tournament_name) <> ''),
  constraint published_tournaments_organizer_not_blank
    check (btrim(organizer_name) <> ''),
  constraint published_tournaments_date_order
    check (end_date >= start_date),
  constraint published_tournaments_max_teams_positive
    check (max_teams is null or max_teams > 0)
);

create index published_tournaments_submission_idx
  on public.published_tournaments(submission_id);
create index published_tournaments_visibility_dates_idx
  on public.published_tournaments(visibility_status, start_date, end_date);
create index published_tournaments_region_idx
  on public.published_tournaments(region);

create trigger published_tournaments_set_updated_at
before update on public.published_tournaments
for each row execute function public.set_updated_at();

alter table public.published_tournaments enable row level security;

revoke all on table public.published_tournaments from public, anon, authenticated;
grant select on table public.published_tournaments to anon, authenticated;
grant all on table public.published_tournaments to service_role;

create policy published_tournaments_public_read
on public.published_tournaments
for select
to anon, authenticated
using (visibility_status = 'published');

create or replace function public.moderate_tournament_submission(
  p_submission_id uuid,
  p_expected_status text,
  p_target_status text,
  p_reviewer_id uuid,
  p_reviewer_note text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current_status text;
  v_note text;
  v_event_type text;
  v_updated public.tournament_submissions;
  v_organizer public.organizers;
  v_public public.published_tournaments;
  v_slug_base text;
  v_slug text;
  v_suffix text;
  v_attempt integer;
begin
  if p_reviewer_id is null or not exists (
    select 1 from public.admin_users where user_id = p_reviewer_id
  ) then
    raise exception using errcode = '42501', message = 'moderation_not_authorized';
  end if;

  if p_target_status not in ('needs_changes', 'approved', 'rejected', 'published') then
    raise exception using errcode = '22023', message = 'moderation_target_invalid';
  end if;

  select status into v_current_status
  from public.tournament_submissions
  where id = p_submission_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'moderation_submission_not_found';
  end if;

  if v_current_status is distinct from p_expected_status then
    raise exception using errcode = '40001', message = 'moderation_conflict';
  end if;

  if not (
    (v_current_status = 'submitted' and p_target_status in ('needs_changes', 'approved', 'rejected'))
    or (v_current_status = 'approved' and p_target_status in ('needs_changes', 'published'))
    or (v_current_status = 'published' and p_target_status = 'needs_changes')
  ) then
    raise exception using errcode = '22023', message = 'moderation_transition_invalid';
  end if;

  v_note := nullif(btrim(p_reviewer_note), '');
  if char_length(v_note) > 2000 then
    raise exception using errcode = '22023', message = 'moderation_note_too_long';
  end if;
  if p_target_status in ('needs_changes', 'rejected') and v_note is null then
    raise exception using errcode = '22023', message = 'moderation_note_required';
  end if;

  v_event_type := case p_target_status
    when 'needs_changes' then 'changes_requested'
    when 'approved' then 'submission_approved'
    when 'rejected' then 'submission_rejected'
    when 'published' then 'submission_published'
  end;

  update public.tournament_submissions
  set
    status = p_target_status,
    reviewer_notes = v_note,
    reviewed_at = case when p_target_status = 'published' then coalesce(reviewed_at, now()) else now() end,
    reviewed_by = case when p_target_status = 'published' then coalesce(reviewed_by, p_reviewer_id) else p_reviewer_id end,
    published_at = case when p_target_status = 'published' then now() else null end
  where id = p_submission_id and status = p_expected_status
  returning * into v_updated;

  if not found then
    raise exception using errcode = '40001', message = 'moderation_conflict';
  end if;

  if p_target_status = 'published' then
    select * into v_organizer
    from public.organizers
    where id = v_updated.organizer_id;

    if not found then
      raise exception using errcode = 'P0002', message = 'moderation_organizer_not_found';
    end if;

    select * into v_public
    from public.published_tournaments
    where submission_id = v_updated.id
    for update;

    if found then
      update public.published_tournaments
      set
        tournament_name = v_updated.tournament_name,
        description = v_updated.description,
        organizer_name = v_organizer.organization_name,
        region = v_updated.region,
        language = v_updated.language,
        start_date = v_updated.start_date,
        end_date = v_updated.end_date,
        timezone = v_updated.timezone,
        format = v_updated.format,
        prize_pool_text = v_updated.prize_pool_text,
        registration_url = v_updated.registration_url,
        bracket_url = v_updated.bracket_url,
        discord_url = v_updated.discord_url,
        stream_url = v_updated.stream_url,
        rules_url = v_updated.rules_url,
        is_online = v_updated.is_online,
        max_teams = v_updated.max_teams,
        registration_deadline = v_updated.registration_deadline,
        visibility_status = 'published',
        source_updated_at = v_updated.updated_at,
        published_at = v_updated.published_at
      where id = v_public.id
      returning * into v_public;
    else
      v_slug_base := trim(both '-' from left(regexp_replace(
        regexp_replace(lower(v_updated.tournament_name), '[^a-z0-9]+', '-', 'g'),
        '-+', '-', 'g'
      ), 100));
      if v_slug_base = '' then v_slug_base := 'tournament'; end if;
      v_slug := v_slug_base;

      if exists (select 1 from public.published_tournaments where slug = v_slug) then
        v_suffix := left(replace(v_updated.id::text, '-', ''), 12);
        v_slug := rtrim(left(v_slug_base, 87), '-') || '-' || v_suffix;
      end if;

      for v_attempt in 1..2 loop
        begin
          insert into public.published_tournaments (
            submission_id, slug, tournament_name, description, organizer_name,
            region, language, start_date, end_date, timezone, format,
            prize_pool_text, registration_url, bracket_url, discord_url,
            stream_url, rules_url, is_online, max_teams, registration_deadline,
            visibility_status, source_updated_at, published_at
          ) values (
            v_updated.id, v_slug, v_updated.tournament_name, v_updated.description,
            v_organizer.organization_name, v_updated.region, v_updated.language,
            v_updated.start_date, v_updated.end_date, v_updated.timezone,
            v_updated.format, v_updated.prize_pool_text, v_updated.registration_url,
            v_updated.bracket_url, v_updated.discord_url, v_updated.stream_url,
            v_updated.rules_url, v_updated.is_online, v_updated.max_teams,
            v_updated.registration_deadline, 'published', v_updated.updated_at,
            v_updated.published_at
          ) returning * into v_public;
          exit;
        exception when unique_violation then
          if v_attempt = 2 then raise; end if;
          v_suffix := left(replace(v_updated.id::text, '-', ''), 12);
          v_slug := rtrim(left(v_slug_base, 87), '-') || '-' || v_suffix;
        end;
      end loop;
    end if;
  elsif v_current_status = 'published' and p_target_status = 'needs_changes' then
    update public.published_tournaments
    set visibility_status = 'hidden'
    where submission_id = v_updated.id;
  end if;

  insert into public.submission_events (
    submission_id, event_type, from_status, to_status,
    actor_type, actor_id, metadata
  ) values (
    v_updated.id, v_event_type, v_current_status, v_updated.status,
    'admin', p_reviewer_id,
    jsonb_build_object(
      'reviewer_note', v_note,
      'moderation_source', 'admin_portal',
      'moderation_version', 'v1'
    )
  );

  return jsonb_build_object(
    'submission_id', v_updated.id,
    'previous_status', v_current_status,
    'status', v_updated.status,
    'updated_at', v_updated.updated_at,
    'reviewed_at', v_updated.reviewed_at,
    'published_at', v_updated.published_at,
    'public_tournament_id', case when v_public.id is null then null else v_public.id end,
    'slug', case when v_public.slug is null then null else v_public.slug end
  );
end;
$$;

revoke all on function public.moderate_tournament_submission(uuid, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.moderate_tournament_submission(uuid, text, text, uuid, text)
  to service_role;
