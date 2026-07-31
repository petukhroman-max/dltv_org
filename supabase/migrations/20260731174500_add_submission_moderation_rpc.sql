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
begin
  if p_reviewer_id is null or not exists (
    select 1
    from public.admin_users
    where user_id = p_reviewer_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'moderation_not_authorized';
  end if;

  if p_target_status not in (
    'needs_changes',
    'approved',
    'rejected',
    'published'
  ) then
    raise exception using
      errcode = '22023',
      message = 'moderation_target_invalid';
  end if;

  select status
  into v_current_status
  from public.tournament_submissions
  where id = p_submission_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'moderation_submission_not_found';
  end if;

  if v_current_status is distinct from p_expected_status then
    raise exception using
      errcode = '40001',
      message = 'moderation_conflict';
  end if;

  if not (
    (v_current_status = 'submitted' and p_target_status in (
      'needs_changes',
      'approved',
      'rejected'
    ))
    or (v_current_status = 'approved' and p_target_status in (
      'needs_changes',
      'published'
    ))
    or (v_current_status = 'published' and p_target_status = 'needs_changes')
  ) then
    raise exception using
      errcode = '22023',
      message = 'moderation_transition_invalid';
  end if;

  v_note := nullif(btrim(p_reviewer_note), '');

  if char_length(v_note) > 2000 then
    raise exception using
      errcode = '22023',
      message = 'moderation_note_too_long';
  end if;

  if p_target_status in ('needs_changes', 'rejected') and v_note is null then
    raise exception using
      errcode = '22023',
      message = 'moderation_note_required';
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
    reviewed_at = case
      when p_target_status = 'published'
        then coalesce(reviewed_at, now())
      else now()
    end,
    reviewed_by = case
      when p_target_status = 'published'
        then coalesce(reviewed_by, p_reviewer_id)
      else p_reviewer_id
    end,
    published_at = case
      when p_target_status = 'published' then now()
      else null
    end
  where id = p_submission_id
    and status = p_expected_status
  returning * into v_updated;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'moderation_conflict';
  end if;

  insert into public.submission_events (
    submission_id,
    event_type,
    from_status,
    to_status,
    actor_type,
    actor_id,
    metadata
  )
  values (
    v_updated.id,
    v_event_type,
    v_current_status,
    v_updated.status,
    'admin',
    p_reviewer_id,
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
    'published_at', v_updated.published_at
  );
end;
$$;

revoke all on function public.moderate_tournament_submission(
  uuid,
  text,
  text,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.moderate_tournament_submission(
  uuid,
  text,
  text,
  uuid,
  text
) to service_role;
