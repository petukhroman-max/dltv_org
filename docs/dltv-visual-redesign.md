# DLTV visual redesign

## Visual direction

DLTV now uses one restrained esports operations language across public,
organizer, and admin contexts. The interface is data-led: typography, spacing,
status, and action hierarchy do the work before decoration. Atmosphere comes
from a low-contrast CSS grid and limited green/gold accents; no game artwork,
fake screenshots, social proof, external integration claims, or decorative 3D
assets are used.

The standalone `dltv_design_prompt.md` referenced in the brief was unavailable.
The explicit direction in the implementation request and the baseline audit in
[`dltv-visual-audit.md`](dltv-visual-audit.md) were used instead.

## Design tokens

Tokens live in `src/app/globals.css`, the project's existing styling layer.

- Background `#0D1117`, surface `#161B22`, elevated surface `#1B222C`.
- Primary green `#2ECC71`, secondary gold `#E8A838`, destructive red
  `#E74C3C`.
- Primary text `#E6EDF3`, secondary text `#8B949E`, and subtle white borders
  at 6% opacity.
- A 4–64 px spacing scale, 4/6/10/12 px radii, restrained shadows, consistent
  focus ring, content widths, 140–180 ms transitions, and reduced-motion rules.
- Breakpoint contracts cover compact mobile (up to 352 px), mobile (up to
  672 px), mid-size layouts, and the wide 1248 px content container.

## Typography

The display stack uses the locally available `Segoe UI Variable Display` with
system fallbacks; body copy uses `Segoe UI Variable Text`/Inter-compatible
fallbacks. Identifiers, times, scores, and operational counts use Cascadia
Code/JetBrains Mono-compatible monospace fallbacks. This avoids font downloads,
new dependencies, and build-time network coupling while retaining a clear
display/body/data hierarchy.

## Layout and shared component system

The existing UI components and semantic native controls are retained and
unified through shared class contracts:

- primary, secondary, text, and destructive button roles;
- input, textarea, select, checkbox, field, form-section, success/error alert;
- regular card, data card, status badge, empty state, and dialog surfaces;
- page header, section header, tabs, breadcrumbs, table/mobile-card patterns;
- public header, organizer shell, and admin console navigation;
- safe external links with visible labels and existing `noopener noreferrer`
  behavior.

This approach keeps current server action signatures and avoids a parallel
design-system package. Borders are reserved for actual grouping and state;
nested information generally uses dividers, rhythm, and typography.

## Public patterns

- The sticky public header has a compact brand mark, real routes, locale
  preservation, a visible submission CTA, and a keyboard-operable mobile menu.
- The homepage now explains the real submission → workspace → publication
  flow, current workspace capabilities, the public projection boundary,
  recently published records, and honest current scope.
- Catalog lifecycle filters read as tabs; the supported region filter remains
  server-driven. A name search was not invented because the current repository
  contract has no search field.
- Tournament pages use a compact event identity, data navigation, summary, and
  match-first operational order before stages, teams/rosters, and lower-priority
  descriptive/provenance data.
- The submission and success flows keep every field and action contract while
  using a narrower, sectioned, readable form rhythm.

## Organizer patterns

The organizer IA remains Overview, Stages, Teams, Matches, with rosters inside
teams. The shell, tournament identity, count strip, next actions, tables/cards,
filters, editors, and destructive disclosures now share one compact operations
language. Desktop keeps a persistent sidebar; mobile uses the existing
keyboard-operable disclosure navigation. Long names and action groups wrap
without widening the page.

## Admin patterns

Admin uses the same tokens with a console treatment: compact header, gold
section marker, status-led tables, stable section tabs, quieter definition
lists, visually prominent moderation, scoped access controls, and chronological
audit events. Authentication and authorization remain unchanged.

## Accessibility and responsive rules

- Visible focus uses a high-contrast green ring and does not rely on hover.
- Status always includes localized text; color is supplementary.
- Native labels, landmarks, heading hierarchy, dialog semantics, and error
  associations are preserved.
- Interactive targets are approximately 40 px or larger.
- At 320/375 px, navigation becomes a toggle, forms become one column, data
  tables remain in a contained scroller, action groups stack safely, and long
  entity names wrap.
- At 768/1024/1440 px, grids progressively use available width without
  stretching reading content.
- Motion is limited to border/background changes and at most 2 px lift; the
  reduced-motion media query removes meaningful transitions and smooth scroll.

## Localization and preserved contracts

All new user-facing landing content exists in both typed EN and RU dictionaries.
The locale switcher still preserves routes, slugs, workspace tokens, team IDs,
match IDs, and query strings through the existing localization utilities.

The redesign does not change database schema, migrations, RPC signatures,
server action contracts, authentication, workspace-token behavior, moderation
or match transitions, public visibility/privacy mappings, or cache/revalidation
semantics.

## Manual QA checklist

1. Open homepage in EN and RU; verify all sections and both CTAs.
2. Open the catalog; switch lifecycle and apply/clear region.
3. Open a published tournament; inspect summary, matches, stages, and rosters.
4. Complete the submission form and verify its success/reference state.
5. Sign in through admin magic link and open list/details.
6. Review moderation, tournament data, access, and audit-history sections.
7. Open a valid workspace and inspect overview metrics/next actions.
8. Create/edit/delete a stage using the existing confirmation flow.
9. Create/edit a team and open roster management.
10. Add/edit/remove a roster member and verify role grouping.
11. Create/schedule/start/complete a match and inspect its public projection.
12. Repeat key public and workspace navigation at 375 px with keyboard focus.

## Known limitations

- Authenticated admin and token-protected organizer visuals require valid local
  credentials/tokens for browser screenshots; automated component and contract
  tests cover their markup without exposing secrets.
- The catalog does not add unsupported full-text search.
- Brackets, standings, imports, and a public API remain outside current scope.
- Typography uses local system fallbacks rather than committing or downloading
  font files.
