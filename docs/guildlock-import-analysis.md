# Guildlock workbook analysis

The adapter was designed from the supplied `Guildlock LAN Datasheet.xlsx` (204,603 bytes), not from its filename. The source contains real player data and is intentionally **not** committed. Repository fixtures reproduce the layout with fictional teams and players.

## Workbook inventory

The OOXML package contains 43 entries (970,780 uncompressed bytes), no VBA project, no external workbook links, no custom XML and no formulas. It contains three classic comment parts with an empty legacy author. The parser treats comments as non-data and does not persist them.

| Sheet            | Data region | Recognized use                                                                       |
| ---------------- | ----------- | ------------------------------------------------------------------------------------ |
| Main Info        | A1:C21      | Event metadata and fallback dates                                                    |
| Qualifiers Day 1 | B2:T42      | Four merged group blocks, teams, W/L, qualification and round fixtures               |
| QD1 Match info   | A1:X50      | Team 1/2, round label, Deadlock match ID, winner and duration; draft columns ignored |
| Qualifiers Day 2 | A2:W42      | Double-elimination bracket and final seeding                                         |
| QD2 Match Info   | A1:X41      | Match list and results; draft columns ignored                                        |
| LAN              | A2:S26      | Partially populated double-elimination bracket                                       |
| LAN Match Info   | A1:X77      | Match template, currently mostly empty; draft columns ignored                        |
| Rosters          | A1:E258     | Repeated team blocks with Role, IGN, Full Name and private platform identifiers      |
| Broadcast Talent | A1:E36      | Out of import scope                                                                  |

The worksheets are formatted far beyond their value ranges (roughly 1,000 physical XML rows each), so limits count meaningful cells and rows, not worksheet styling alone.

## Structural observations

- Guildlock detection requires the characteristic sheet combination plus headers such as `Team 1`, `Team 2`, `Match`, `ID`, `Winner`, `Role` and `IGN (In-Game Name)`. A filename is never a detection signal.
- Group headings are merged (`B2:E2`, `G2:J2`, `L2:O2`, `Q2:T2`) and repeat Team/W/L/Qualified blocks.
- Match sheets use merged title/draft headings. Rows 3 and 4 are examples and must be excluded.
- Qualifier round labels encode group and round; Day 2 and LAN match labels encode a match number.
- `FF` is used for forfeits. Some match rows are placeholders or duplicated game records. A malformed winner value and incomplete rows occur in the supplied workbook, so these become warnings/conflicts instead of silent writes.
- Match sheets do not provide an unambiguous series score for every result. The adapter imports safe identifiers/scheduling structure and only proposes a completed result when all required result fields are present.
- No reliable stream/VOD or timezone column is present. Missing timezone produces a warning and uses the tournament fallback only after preview.
- Bracket geometry is visual and not a sufficient source of safe link edges in all populated sheets. MVP therefore imports group assignments and unambiguous match positions only; inferred bracket links are skipped with warnings.
- The Rosters sheet contains private full names and an unlabeled private column. Full names are not part of the normalized contract. An identifier column is imported only when its header explicitly identifies a platform/Steam/Deadlock ID; the supplied unlabeled column is ignored. Mapped platform IDs remain private, are redacted from preview/audit/report output, and are never emitted by public projections.

## Adapter boundaries

The Guildlock adapter reads `Main Info`, qualifier/LAN bracket sheets, their match-info companions and `Rosters`. It ignores picks/bans and `Broadcast Talent`. It does not evaluate formulas, macros or external links. Unknown/renamed layouts fall back to explicit custom column mapping instead of speculative parsing.
