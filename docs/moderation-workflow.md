# Admin moderation workflow

The protected submission details page supports a small, explicit moderation
workflow. It does not provide a generic status selector or edit tournament and
organizer fields.

## Supported actions and transitions

| Action          | Current status | Target status   | Reviewer note |
| --------------- | -------------- | --------------- | ------------- |
| Request changes | `submitted`    | `needs_changes` | Required      |
| Request changes | `approved`     | `needs_changes` | Required      |
| Request changes | `published`    | `needs_changes` | Required      |
| Approve         | `submitted`    | `approved`      | Optional      |
| Reject          | `submitted`    | `rejected`      | Required      |
| Publish         | `approved`     | `published`     | Optional      |

`draft`, `needs_changes`, and `rejected` have no active moderation controls.
There is no rollback dropdown. Returning a `needs_changes` submission to
`submitted` belongs to a future authenticated organizer flow.

## Reviewer notes

Notes are trimmed and stored as plain text. An empty value becomes `null`; the
maximum length is 2,000 characters. A note is mandatory when requesting
changes or rejecting and optional when approving or publishing.

`tournament_submissions.reviewer_notes` holds the latest action's note. Each
audit event separately stores the note snapshot for that action, so previous
event history is append-only and remains unchanged.

## Timestamp behavior

For `needs_changes`, `approved`, and `rejected`:

- `reviewed_at = now()`;
- `reviewed_by` is the current authenticated admin UUID;
- `published_at = null`.

For `published`:

- existing `reviewed_at` is preserved, or initialized to `now()`;
- existing `reviewed_by` is preserved, or initialized to the current admin;
- `published_at = now()`.

The existing trigger updates `updated_at`. Moderation never changes
`submitted_at`. Moving a published submission to `needs_changes` clears
`published_at`.

## Audit events

The RPC appends one event in the same transaction as the status update:

| Target status   | Event type             |
| --------------- | ---------------------- |
| `needs_changes` | `changes_requested`    |
| `approved`      | `submission_approved`  |
| `rejected`      | `submission_rejected`  |
| `published`     | `submission_published` |

The actor type is always `admin`, and the actor ID is the authenticated admin
UUID. The browser cannot provide the event type, actor, timestamps, or
metadata. The RPC constructs this metadata:

```json
{
  "reviewer_note": null,
  "moderation_source": "admin_portal",
  "moderation_version": "v1"
}
```

The UI shows readable event labels and the reviewer note. Unknown event
metadata continues to use an escaped and redacted JSON fallback.

## Atomic RPC

Migration
`supabase/migrations/20260731174500_add_submission_moderation_rpc.sql` creates:

```sql
public.moderate_tournament_submission(
  p_submission_id uuid,
  p_expected_status text,
  p_target_status text,
  p_reviewer_id uuid,
  p_reviewer_note text
)
```

The `SECURITY DEFINER` function has a fixed search path, uses no dynamic SQL,
and is executable only by `service_role`. It verifies the reviewer exists in
`public.admin_users`, validates the current and target statuses, enforces note
rules, updates the submission, and inserts the event in one transaction.

The response contains only submission/status/timestamp fields; it does not
return organizer contact details.

## Concurrency protection

Every form includes the status rendered by the protected server page as
`expected_status`. It is not trusted as authorization. The RPC updates only
when both the submission UUID and status still match:

```sql
where id = p_submission_id
  and status = p_expected_status
```

If another administrator wins the race, the second call raises controlled
SQLSTATE `40001`. The service converts it into a generic conflict message and
does not expose PostgreSQL or Supabase details. This also protects against
duplicate form submissions; disabling the pending button is only a UX layer.

## Authorization model

Each Server Action calls `requireAdmin()`. The reviewer UUID comes only from
the returned `AdminIdentity`, never from form data. The TypeScript service
strictly validates the input and transition before one RPC call. The RPC then
independently verifies `admin_users` membership and the transition because the
service-role client bypasses RLS.

There are no direct browser writes and no public moderation API.

## Applying the migration

Review the migration and dry-run output before applying it. Codex does not
apply this migration to remote Supabase automatically.

```bash
npx supabase db push --dry-run
npx supabase db push
```

The second command is the explicit deployment step after review.

## Manual test flow

1. Open a `submitted` submission as an authenticated admin.
2. Approve it and verify `approved`, `reviewed_at`, `reviewed_by`, and a
   `submission_approved` event.
3. Publish it and verify `published_at` and a `submission_published` event.
4. Create another public submission and request changes with a note; verify
   `needs_changes` and `changes_requested`.
5. Create another submission and reject it with a note; verify `rejected` and
   `submission_rejected`.
6. Confirm rejection and request-changes forms reject an empty note.
7. Attempt a stale repeat action and verify the safe concurrency message.
8. Verify logout and non-admin access still block moderation.
9. Verify no organizer notification is sent and the UI states this clearly.
10. Check the moderation forms on a mobile viewport.

## Known limitations

- Organizer notifications are not implemented.
- Organizers cannot authenticate, edit, or resubmit changes yet.
- There is no public tournament page or DLTV export.
- There is one administrator role and no generic RBAC.
- Moderation is available only on a submission details page; there are no bulk
  or inline list actions.
- Integration tests require a running local Supabase/Docker environment and
  are not part of the unit test suite.

## Deferred work

A later PR should add organizer authentication and a controlled edit/resubmit
flow from `needs_changes` to `submitted`, followed separately by notification
delivery and public publication/export behavior.
