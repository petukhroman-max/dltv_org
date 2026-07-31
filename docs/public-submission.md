# Public tournament submission

## User flow

The home-page action opens `/submit-tournament`. The organizer completes one
form, confirms publication consent, and submits it to a Server Action. A
successful atomic database write redirects to
`/submit-tournament/success?id=<submission_id>`. The success page validates the
UUID and displays only that reference and the `Submitted` status; it does not
read arbitrary submission data.

## Fields

Organizer contact:

- organization name
- contact person
- contact email
- Discord username
- organization website

Tournament details:

- tournament name
- description
- region
- language
- start and end dates
- IANA timezone
- tournament format
- prize-pool text
- online/offline flag
- maximum teams
- registration deadline

Links and additional information:

- registration, bracket, Discord, stream, and rules URLs
- organizer notes

## Required fields

Organization name, contact person, contact email, tournament name, region,
start date, end date, timezone, and publication consent are required.

## Validation rules

The Server Action accepts only the named public fields. It trims strings,
normalizes email to lowercase, converts optional empty strings to `null`, and
validates email, date ordering, positive integer team limits, IANA timezone,
and http/https URLs. Registration deadline must be ISO 8601 with an explicit
timezone offset. The payload cannot provide organizer ID, submission ID,
status, review fields, actor type, or arbitrary event metadata.

## Consent behavior

The checkbox is required and is verified server-side. The atomic service adds
the fixed consent payload:

```json
{
  "consent_to_publish": true,
  "consent_version": "v1"
}
```

The RPC verifies these values and stores them in the
`submission_submitted` event metadata. No new consent column is required.

## Anti-spam behavior

- A visually hidden `company_fax` honeypot must remain empty.
- A render timestamp supplies a low-cost minimum three-second fill-time signal.
- The total `FormData` payload is limited to 32 KiB.
- All domain validation runs server-side.
- The submit button is disabled and announces progress while pending.
- Errors from spam checks and the database use one generic public message.

The timestamp can be forged and the honeypot can be bypassed. There is no
distributed rate limiter or CAPTCHA provider in this stage.

## Server Action flow

`submitTournamentAction` passes `FormData` to the testable public submission
service. That service checks payload size, honeypot, fill time, allowed fields,
domain validation, and consent. It invokes the injected atomic service exactly
once. Validation failures preserve submitted values and return field errors;
database failures return no internal details.

## Atomic database write

`20260731_update_public_submission_rpc.sql` replaces the existing RPC without
editing the applied bootstrap migration. In one transaction it creates:

1. an organizer;
2. a tournament submission with `status = submitted`,
   `submitted_at = now()`, and null review/publication fields;
3. a `submission_submitted` event with actor `organizer`, destination status
   `submitted`, and consent metadata.

The RPC remains revoked from `public`, `anon`, and `authenticated` and is
executable only by `service_role`.

## Success behavior

The redirect includes only the generated submission UUID. The success page
validates it and shows the reference, `Submitted` status, review expectation,
and navigation links. It does not show contact details, review notes, database
metadata, other submissions, or service errors.

## Known limitations

- no full rate limiting or CAPTCHA;
- no organizer authentication or ownership;
- no editing after submission;
- no notification when review finishes;
- no admin moderation interface;
- no uploaded logos or other files.

## Deferred features

Authentication, magic links, editing, moderation workflow, notifications,
teams, players, matches, brackets, uploads, social integrations, analytics,
AI extraction, public API, and DLTV export belong in later stages.

## Manual test checklist

- Open `/submit-tournament`.
- Submit a minimally valid form after at least three seconds.
- Confirm the success page shows the submission ID and `Submitted`.
- Verify one row in `organizers`.
- Verify one row in `tournament_submissions`, `status = submitted`, and a
  populated `submitted_at`.
- Verify one `submission_submitted` event with consent version `v1`.
- Try an end date before the start date.
- Try invalid URL and timezone values.
- Try submitting without consent.
- Confirm the layout and focus states on a mobile viewport.
- Confirm repeated clicks are disabled while the action is pending.
