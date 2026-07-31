# Organizer edit and resubmission flow

## Capability lifecycle

An authenticated administrator may create a link only while a submission is
`needs_changes`. The server generates 32 cryptographically random bytes and
encodes them as a 43-character base64url token. The URL is displayed once. The
database stores only its lowercase SHA-256 hash and a default seven-day expiry.

Creating a link transactionally revokes every previous unresolved token. A
partial unique index permits at most one row with both `used_at` and
`revoked_at` null. PostgreSQL cannot use `now()` in an immutable partial-index
predicate, so creation revokes expired unresolved rows too; application status
still distinguishes active from expired. Admins may explicitly revoke an
active link. Creation and revocation append fixed admin audit events.

Raw tokens must not be copied into logs, audit metadata, analytics, error
messages, browser storage, or application-wide state. Anyone holding a valid
link can edit the submission until it expires, is revoked, or is used.

## Public route and data exposure

`/edit-submission/[token]` is dynamic and sends `Cache-Control: no-store`,
`X-Robots-Tag: noindex, nofollow, noarchive`, and `Referrer-Policy: no-referrer`.
Malformed, missing, expired, revoked, used, wrong-status, and unknown tokens all
render the same response.

The lookup returns only editable tournament fields plus `reviewer_notes` for
the read-only “Changes requested by DLTV” message. Organizer identity/contact,
admin identity, status, reviewer UUID and lifecycle timestamps are not exposed.

Editable fields are explicitly allowlisted:

- tournament name, description, region, language, dates and timezone;
- format, prize pool, online flag, team limit and registration deadline;
- registration, bracket, Discord, stream and rules URLs;
- organizer notes.

The form reuses domain validation, rejects non-HTTP(S) URLs, enforces a 32 KiB
payload limit, requires explicit resubmission confirmation, preserves entered
values after validation errors, and disables its pending submit control. It
does not request a new publication consent.

## Atomic resubmission

`resubmit_tournament_submission(p_token_hash text, p_submission jsonb)` locks
the token row and verifies that the token is active and its submission is still
`needs_changes`. In one transaction it:

1. updates only the explicit tournament allowlist;
2. moves the submission to `submitted` and refreshes `submitted_at`;
3. preserves `reviewer_notes`, clears `reviewed_at`/`reviewed_by`, and clears
   `published_at`;
4. sets the token's `used_at`;
5. appends `submission_resubmitted` with organizer actor, null actor ID and
   fixed metadata.

The function uses `SECURITY DEFINER`, a pinned search path, no dynamic SQL, and
is executable only by `service_role`. Direct table access remains revoked from
`anon` and `authenticated`.

## Applying the migration

Review the dry run before applying anything remotely:

```bash
npx supabase db push --dry-run
npx supabase db push
```

The second command requires an explicit deployment decision and is not run by
this change.

## Manual checklist

1. Request changes on a submitted tournament with a reviewer note.
2. Create a link and copy it before refreshing the admin page.
3. Confirm the admin page shows `active`; create another link and confirm the
   first becomes invalid.
4. Open the current link and verify only allowlisted tournament fields and the
   reviewer note appear.
5. Trigger validation errors and confirm values remain populated.
6. Resubmit successfully and verify status/timestamps, token `used_at`, and the
   audit event.
7. Confirm the used link and a revoked link produce the same generic invalid
   page as a malformed token.

## Known limitations

- Links are shared capabilities; there is no organizer account or recipient
  identity check.
- Link delivery and organizer notifications are manual.
- Only one active link is supported per submission.
- Local database integration tests require Docker and a running Supabase stack.
