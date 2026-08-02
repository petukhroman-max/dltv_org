-- Explicit session-level fallback timezone confirmation for table imports.

alter table public.tournament_import_rows
  add column source_references jsonb not null default '[]'::jsonb,
  add constraint tournament_import_source_references_array check (
    jsonb_typeof(source_references)='array'
  );

update public.tournament_import_rows set source_references=jsonb_build_array(
  jsonb_build_object('sheet',source_sheet,'row',source_row_number)
) where source_references='[]'::jsonb;

alter table public.tournament_import_sessions
  add column fallback_timezone text not null default 'UTC',
  add column timezone_confirmation_required boolean not null default false,
  add column timezone_confirmed_at timestamptz null,
  add constraint tournament_import_fallback_timezone_safe check (
    btrim(fallback_timezone)<>'' and char_length(fallback_timezone)<=64
    and fallback_timezone ~ '^[A-Za-z0-9_+./-]+$'
  );

update public.tournament_import_sessions i set
  fallback_timezone=coalesce(nullif(btrim(s.timezone),''),'UTC')
from public.tournament_submissions s
where s.id=i.submission_id;

update public.tournament_import_rows r set
  warnings=r.warnings||jsonb_build_array('timezone_fallback_confirmation_required'),
  validation_status=case when r.validation_status='valid' then 'warning' else r.validation_status end
where r.entity_type in ('stage','match')
  and coalesce(r.normalized_payload->>'timezone','')=''
  and not r.warnings@>jsonb_build_array('timezone_fallback_confirmation_required');

update public.tournament_import_sessions i set
  timezone_confirmation_required=true,
  timezone_confirmed_at=null,
  status=case when i.status='ready' then 'validation_failed' else i.status end,
  validation_summary=jsonb_set(
    jsonb_set(i.validation_summary,'{timezoneConfirmationRequired}','true'::jsonb,true),
    '{warnings}',
    to_jsonb(coalesce((
      select sum(jsonb_array_length(r.warnings))::integer
      from public.tournament_import_rows r where r.session_id=i.id
    ),0)),
    true
  )
where i.status not in ('completed','cancelled','expired','failed')
  and exists (
    select 1 from public.tournament_import_rows r
    where r.session_id=i.id and r.entity_type in ('stage','match')
      and coalesce(r.normalized_payload->>'timezone','')=''
  );

create or replace function public.confirm_tournament_import_timezone(
  p_session_id uuid,
  p_submission_id uuid,
  p_timezone text,
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
  v_removed_warnings integer := 0;
  v_status text;
begin
  if p_timezone is null or btrim(p_timezone)='' or char_length(p_timezone)>64
    or p_timezone !~ '^[A-Za-z0-9_+./-]+$' then
    raise exception using errcode='22023',message='import_timezone_invalid';
  end if;
  p_timezone := btrim(p_timezone);
  perform public.assert_operational_mutation_access(
    p_submission_id,p_actor_type,p_actor_id,p_workspace_token_id
  );
  select * into v_session from public.tournament_import_sessions
  where id=p_session_id and submission_id=p_submission_id for update;
  if not found then raise exception using errcode='P0002',message='import_session_not_found'; end if;
  if v_session.status in ('applying','completed','cancelled','expired') then
    raise exception using errcode='22023',message='import_session_locked';
  end if;
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

  select count(*) into v_removed_warnings
  from public.tournament_import_rows r
  cross join lateral jsonb_array_elements_text(r.warnings) warning(value)
  where r.session_id=p_session_id
    and warning.value='timezone_fallback_confirmation_required';

  with patched as (
    select r.id,
      coalesce((
        select jsonb_agg(item)
        from jsonb_array_elements(r.warnings) item
        where item<>to_jsonb('timezone_fallback_confirmation_required'::text)
      ),'[]'::jsonb) as remaining_warnings
    from public.tournament_import_rows r
    where r.session_id=p_session_id
      and r.entity_type in ('stage','match')
  )
  update public.tournament_import_rows r set
    normalized_payload=case
      when coalesce(r.normalized_payload->>'timezone','')=''
        then jsonb_set(r.normalized_payload,'{timezone}',to_jsonb(p_timezone),true)
      else r.normalized_payload
    end,
    warnings=patched.remaining_warnings,
    validation_status=case
      when r.proposed_action='invalid' or jsonb_array_length(r.validation_errors)>0 then 'invalid'
      when r.proposed_action='conflict' then 'conflict'
      when jsonb_array_length(patched.remaining_warnings)>0 then 'warning'
      else 'valid'
    end
  from patched where r.id=patched.id;

  v_status := case when exists (
    select 1 from public.tournament_import_rows
    where session_id=p_session_id and (
      proposed_action='invalid'
      or (proposed_action='conflict' and resolution is null)
    )
  ) then 'validation_failed' else 'ready' end;

  update public.tournament_import_sessions set
    fallback_timezone=p_timezone,
    timezone_confirmation_required=false,
    timezone_confirmed_at=now(),
    status=v_status,
    validation_summary=jsonb_set(
      jsonb_set(validation_summary,'{timezoneConfirmationRequired}','false'::jsonb,true),
      '{warnings}',
      to_jsonb(greatest(coalesce((validation_summary->>'warnings')::integer,0)-v_removed_warnings,0)),
      true
    )
  where id=p_session_id;

  insert into public.submission_events(submission_id,event_type,actor_type,actor_id,metadata)
  values(p_submission_id,'import_timezone_confirmed',
    case when p_actor_type='admin' then 'admin' else 'organizer' end,
    case when p_actor_type='admin' then p_actor_id else null end,
    jsonb_build_object('session_id',p_session_id,'timezone',p_timezone,'operational_version','v1')
      ||public.operational_actor_metadata(p_actor_type));
  return jsonb_build_object('session_id',p_session_id,'timezone',p_timezone,'status',v_status);
end; $$;
revoke all on function public.confirm_tournament_import_timezone(uuid,uuid,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.confirm_tournament_import_timezone(uuid,uuid,text,text,uuid,uuid) to service_role;
