# Organizer Portal UX and localization

## UX goals and information architecture

The portal prioritizes fast operational work: clear tournament context, visible next actions, compact data presentation, predictable forms, and safe destructive actions. Organizer navigation is Overview, Stages, Teams, and Rosters. Rosters remain team-scoped and each team links to its roster. Admin detail uses Overview, Moderation, Tournament data, Access, and History sections.

Overview reports real stages, teams, active roster members, teams without a roster, and tournament status. The checklist is guidance only; no completion percentage is shown because no blocking completeness policy exists.

## Route map

Public and organizer routes:

- `/en`, `/ru`
- `/{locale}/submit-tournament` and success
- `/{locale}/tournaments`
- `/{locale}/tournaments/[slug]`
- `/{locale}/workspace/[token]`
- `/{locale}/edit-submission/[token]` and success

Admin routes:

- `/{locale}/admin/login`
- `/{locale}/admin/unauthorized`
- `/{locale}/admin/submissions`
- `/{locale}/admin/submissions/[id]`

`/auth/callback` remains the fixed unprefixed OAuth callback. It accepts only an allowlisted locale hint and redirects to a localized admin destination after authorization. Legacy user routes redirect to `/en`; secret-route redirects preserve the complete token path.

## Locale and translation architecture

English is the explicit default. `src/i18n` contains the compile-time locale allowlist, typed dictionaries, request lookup, and UTC-preserving date formatting. English defines the dictionary shape and Russian must satisfy the same recursive shape. Large client screens receive only component-specific operational copy; there is no global client dictionary payload.

Stored enum values are unchanged. UI mappings translate statuses, stage types, team states, roster roles, and captain labels at the presentation boundary.

The EN/RU switcher replaces only the first URL segment. It preserves search parameters, slugs, IDs, workspace tokens, and edit tokens. Switching language performs navigation only and never changes authorization, submission, token, or business state.

## Design system and shared components

`globals.css` centralizes background, surfaces, border, text levels, accent, destructive, success, warning, error, focus, spacing, radii, and typography sizes. The interface uses a dark neutral canvas, restrained borders, compact cards, one green accent, and explicit status text.

Shared primitives include `LocaleSwitcher`, `Breadcrumbs`, `OrganizerShell`, `EmptyState`, `ConfirmationDialog`, buttons, badges, cards, tables, alerts, and form controls.

Forms retain labels above fields, native required semantics, field-level `aria-describedby`, preserved values after server validation, and localized pending states. Related fields stay grouped without introducing a wizard.

## Error localization

Stable presentation codes include `STAGE_SEQUENCE_CONFLICT`, `DUPLICATE_TEAM_NAME`, `DUPLICATE_PLATFORM_ID`, `DUPLICATE_MEMBERSHIP`, `STALE_UPDATE`, `WORKSPACE_ACCESS_INVALID`, `TEAM_HAS_ROSTER_HISTORY`, and `UNKNOWN`. UI fallbacks never expose SQLSTATE, RPC names, Supabase errors, or stack traces. Existing RPC and service contracts remain intact.

## Accessibility

The redesign adds semantic section navigation, one page `h1`, localized breadcrumbs, visible focus rings, explicit status text, a labeled locale control, native modal dialogs, visible cancel actions, named destructive actions, responsive single-column forms, and keyboard-accessible navigation. Native `<dialog>` provides Escape handling and focus restoration.

## SEO and private routes

Public routes emit localized titles, descriptions, canonicals, and EN/RU language alternates. Sitemap entries use locale-prefixed URLs. Admin, workspace, organizer-edit, and private success routes remain noindex/nofollow and no-store where required. Capability tokens never appear in metadata, breadcrumb labels, or standalone visible content.

## Security invariants

This change does not alter token hashing, expiration, revoke/rotation, submission isolation, admin authorization, server-only mutations, RLS, service-role boundaries, optimistic concurrency, audit events, `real_name` privacy, or platform-ID privacy. Locale is presentation context only.

## Manual smoke test

1. Open a valid EN workspace.
2. Switch to RU and confirm the same tournament/token route remains selected.
3. Check Overview, Stages, Teams, and Rosters navigation.
4. Add a stage in RU and edit it in EN.
5. Add a team and open its roster.
6. Create a player and add an existing player.
7. Change captain, remove a member, and restore that member.
8. Open admin submissions and the same submission in EN and RU.
9. Exercise moderation and confirm localized safe feedback.
10. Check workspace/edit-link rotation and revoke dialogs.
11. Check public home, submission, catalog, and tournament detail in both locales.
12. Repeat navigation and forms at 375 px, then revoke the workspace link.

## Known limitations and next step

User-provided tournament content and database metadata remain in their source language. UI dates are localized while stored UTC values remain unchanged. Capability-protected screens still require a valid seeded environment for end-to-end browser testing.

The next PR is **Organizer Workspace Matches and Schedule CRUD**. Matches, schedule, brackets, standings, imports, sync, APIs, widgets, and public roster projection are intentionally outside this PR.
