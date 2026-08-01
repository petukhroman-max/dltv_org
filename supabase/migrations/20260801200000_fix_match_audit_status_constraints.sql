-- Match lifecycle events share submission_events with moderation events.
-- Extend the status checks so match RPC audit writes remain atomic.

alter table public.submission_events
  drop constraint submission_events_from_status_allowed,
  drop constraint submission_events_to_status_allowed;

alter table public.submission_events
  add constraint submission_events_from_status_allowed check (
    from_status is null
    or from_status in (
      'draft', 'submitted', 'needs_changes', 'approved', 'published', 'rejected',
      'scheduled', 'live', 'completed', 'postponed', 'cancelled', 'walkover'
    )
  ),
  add constraint submission_events_to_status_allowed check (
    to_status is null
    or to_status in (
      'draft', 'submitted', 'needs_changes', 'approved', 'published', 'rejected',
      'scheduled', 'live', 'completed', 'postponed', 'cancelled', 'walkover'
    )
  );
