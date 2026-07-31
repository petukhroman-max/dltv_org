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
  if coalesce((p_submission ->> 'consent_to_publish')::boolean, false) is not true
    or coalesce(p_submission ->> 'consent_version', '') <> 'v1'
  then
    raise exception using
      errcode = '23514',
      message = 'Valid publication consent is required';
  end if;

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
    organizer_notes,
    submitted_at
  )
  values (
    v_organizer.id,
    'submitted',
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
    nullif(btrim(p_submission ->> 'organizer_notes'), ''),
    now()
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
    'submission_submitted',
    null,
    'submitted',
    'organizer',
    jsonb_build_object(
      'consent_to_publish', true,
      'consent_version', 'v1'
    )
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
