# DLTV visual audit

## Scope and method

This audit covers the public site, organizer workspace, and admin console on the
`main` baseline merged through PR #15. Public routes were inspected in the
running application; token-protected organizer and authenticated admin screens
were reviewed through their rendered component structure and existing tests.
No credentials, workspace tokens, private player data, or seeded production-like
records were introduced for visual inspection.

The standalone `dltv_design_prompt.md` referenced by the brief was not present in
the repository or supplied attachments. The explicit palette, typography,
anti-patterns, screen requirements, and accessibility criteria in the task are
therefore the design source of truth.

## Baseline screen review

### Public

| Screen             | Baseline observation                                                                                                                                                             | Redesign target                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Homepage           | A single bordered hero reads as a submission gateway rather than a finished product landing. It provides no product proof or explanation of the workspace and public projection. | Product-led hero, honest workflow and capability sections, real recently published data, and a concise current-product-status section.                             |
| Tournament catalog | Heading, filters, and cards are functional, but filters feel detached and cards give all facts equal weight.                                                                     | Strong page header, compact filter toolbar, lifecycle-first hierarchy, responsive cards, and a clear detail action.                                                |
| Tournament page    | Tournament details precede operational data and use the same form-section treatment as editable forms.                                                                           | Compact event header and facts, persistent section navigation, matches before descriptive detail, then stages and rosters.                                         |
| Submit tournament  | One long form with large repeated bordered fieldsets creates excessive vertical weight.                                                                                          | Narrow reading measure, numbered section headers, related-field grids, calm helper text, and a distinct submit footer without changing fields or action contracts. |
| Submission success | Technically clear but visually indistinguishable from sign-in and error cards.                                                                                                   | Purpose-specific success state, prominent reference value, concise next step, and consistent navigation.                                                           |

### Organizer workspace

| Screen               | Baseline observation                                                                                                                 | Redesign target                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Overview             | Sidebar is useful, but summary, metadata, warning, and next actions compete as separate boxes.                                       | Persistent operations shell, compact tournament identity, metric strip, contextual next actions, and lower-emphasis metadata.     |
| Stages               | Create and edit forms visually outweigh existing records; actions are spread through open disclosure panels.                         | Structured operational rows/cards, one clear create action, compact edit disclosure, and restrained destructive treatment.        |
| Teams                | Team identity, seed, status, and roster readiness do not form a fast scanning line.                                                  | Consistent identity row, metadata columns, visible roster action, mobile card fallback.                                           |
| Rosters              | Player creation/search/membership editing creates a dense vertical stack and weak separation between profile and membership actions. | Team-led grouping, role hierarchy, collapsed creation controls, and visually separate membership/profile/destructive actions.     |
| Matches and schedule | Filters, creation, status transitions, editing, and result entry share similar visual weight.                                        | Compact toolbar, grouped upcoming/live/completed records, status-led actions, and result entry separated from base match editing. |
| Match detail/forms   | Two-column inputs collapse correctly, but labels, controls, and action sets remain visually repetitive.                              | Denser form rhythm, predictable wide fields, a distinct transition/action rail, and mobile-safe action wrapping.                  |

### Admin

| Screen             | Baseline observation                                                                                | Redesign target                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Login              | Clear flow, but a generic centered bordered card does not establish an operations-console identity. | Branded, focused access panel with security context and a single dominant action.                                        |
| Submissions list   | Filter card and table container duplicate borders; the row action is not visually distinct enough.  | Compact console header, integrated filters, readable table hierarchy, status system, and clear primary row action.       |
| Submission details | Many equal admin panels fragment one review task.                                                   | Stable section tabs, stronger identity header, quieter data groups, and prioritized review sequence.                     |
| Moderation         | Important transitions appear inside the same card language as passive information.                  | Dedicated moderation surface with clear primary, secondary, and destructive hierarchy while preserving transition rules. |
| Tournament data    | Operational summaries, entities, and raw metadata compete at one level.                             | Data-first summaries, structured rows, compact metadata, and responsive overflow handling.                               |
| Access             | Create/revoke controls need clearer security context and destructive distinction.                   | Explicit token state, scoped action grouping, safe copy affordance, and red revoke treatment.                            |
| Audit history      | Events read as repeated containers and metadata rather than a chronological operational record.     | Timeline/list rhythm with localized labels, time, actor, and human-readable detail; raw metadata remains secondary.      |

## Repeating system problems

- **Hierarchy:** page headers, section headers, cards, and forms use similar size,
  padding, border, and background values. Primary tasks do not reliably win the
  first scan.
- **Spacing:** the scale is small and incomplete, while local components use many
  unrelated literal gaps. Long pages accumulate excess vertical space.
- **Typography:** generic system typography lacks a distinct display/data voice;
  headings, labels, metadata, and identifiers are not consistently separated.
- **Borders:** most content becomes a bordered rectangle, including nested cards.
  This adds noise and makes important surfaces hard to identify.
- **Actions:** primary, secondary, text, and destructive actions are not always
  differentiated by role. Dense operational areas expose too many controls at
  once.
- **Forms:** fields are correctly labelled but sections are oversized, optional
  metadata is visually loud, and desktop controls often occupy more width than
  their content needs.
- **Navigation:** public navigation is compact but has no accessible mobile menu;
  public tournament section order does not prioritize match data. Workspace and
  admin navigation use different visual vocabularies.
- **Statuses:** several badge implementations use independent color mappings and
  similar pill styling; state is textual, but the system is not unified.
- **Responsive behavior:** tables rely on overflow, action groups can become
  crowded, and long labels/names need more explicit wrapping safeguards around
  320–375 px.
- **Motion and focus:** focus is visible, but transition timing and reduced-motion
  behavior are not defined as a coherent system.

## Component unification plan

The redesign keeps existing data and action contracts and unifies them through:

- centralized color, type, spacing, radius, width, shadow, focus, breakpoint,
  and motion tokens in the existing global stylesheet;
- shared button roles and native input/select/textarea/checkbox contracts;
- consistent page/section headers, cards, data cards, alerts, empty states,
  dialogs, tabs, breadcrumbs, tables/mobile cards, status badges, and external
  links;
- one compact navigation language across public, workspace, and admin contexts;
- responsive rules that move grids to one column, contain data overflow, preserve
  roughly 40 px touch targets, and prevent long content from widening the page.

## Constraints preserved

The redesign does not alter routes, localization architecture, server actions,
Supabase schema, migrations, RPC signatures, authentication, workspace tokens,
moderation or match transitions, public visibility/privacy mapping, or cache and
revalidation behavior. Search, public API claims, external integrations, and
product metrics are not invented where the current product has no supporting
data or route.
