# Organizer Portal UX audit

## Current route map

The portal currently exposes public home, submission, submission-success, tournament catalog and tournament-detail routes; private organizer edit and workspace capability routes; admin login, callback, submissions list and submission detail routes. All routes are currently unprefixed and English-only.

## Primary flows

1. An organizer submits a tournament and receives a reference.
2. An admin signs in by magic link, reviews the submission, moderates it, and manages organizer access links.
3. An organizer uses an edit link to revise a submission or a workspace link to maintain stages, teams, players, and rosters.
4. A visitor browses published tournaments.

## Findings

- Workspace information architecture is one long page. Overview, stages, teams, and rosters have no persistent navigation or page-level hierarchy.
- Rosters are rendered after all teams rather than being entered from a team context. The relationship between team and roster is therefore easy to miss.
- Admin submission detail combines moderation, access, submission data, tournament data, and history in a single uninterrupted page.
- Public, admin, and workspace surfaces repeat cards, buttons, status treatments, alerts, form controls, and empty-state patterns with small inconsistencies.
- Stage, team, and player forms expose many fields at once without clear Basic information, Schedule, Identity, or Status groupings.
- Destructive actions use disclosure elements rather than a consistent dialog pattern. The resulting hierarchy and keyboard expectations are unclear.
- Several labels describe implementation concepts (operational data, token status, submission reference) instead of the user's task.
- Empty and error states usually report absence but do not consistently explain why the section matters or what to do next.
- Breadcrumbs are absent from both organizer and admin detail flows.
- Desktop admin navigation is header-only; the current submission context disappears while scrolling a long detail page.
- Mobile layouts stack controls, but dense operational sections remain hard to scan and lack compact section navigation.
- The page-level `h1` scale was designed for public marketing pages and is oversized for operational screens.
- User-facing copy is English-only and spread across pages, components, and service error mappings.
- Dates are generally rendered as stored strings rather than locale-aware presentation values.
- Public metadata has no locale alternates; private route metadata needs a single token-safe noindex policy.

## Organizer/admin divergence

Both surfaces manipulate or inspect the same tournament concepts but use different headers and hierarchy. They should share tokens, cards, badges, breadcrumbs, tabs, empty states, form controls, and dialogs while retaining role-specific navigation and actions.

## Direction

- Add stable `/en` and `/ru` URLs with English as the explicit default redirect target.
- Introduce a typed dictionary and stable application error codes.
- Use an organizer shell with Overview, Stages, Teams, and Rosters navigation.
- Keep rosters visually nested under teams and provide direct team-to-roster anchors.
- Structure admin detail with visible section tabs: Overview, Moderation, Tournament data, Access, History.
- Centralize design tokens and reusable navigation, breadcrumb, empty-state, alert, dialog, and field patterns.
- Preserve all authorization, token, RPC, optimistic-concurrency, privacy, and audit boundaries.
