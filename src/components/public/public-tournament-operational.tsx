import type { Locale } from "@/i18n/config";
import {
  formatPublicDateTime,
  safePublicUrl,
} from "@/lib/public-tournaments/presentation";
import type {
  PublicMatch,
  PublicTeamSummary,
  PublicTournamentProjection,
} from "@/lib/public-tournaments/public-operational.types";

const copy = {
  en: {
    overview: "Overview",
    stages: "Stages",
    matches: "Matches",
    teams: "Teams",
    bracket: "Bracket",
    standings: "Standings",
    qualified: "Qualified",
    note: "Note",
    bracketUpdating: "The bracket is still being updated.",
    live: "Live",
    upcoming: "Upcoming",
    results: "Results",
    unscheduled: "Unscheduled",
    nextMatch: "Next match",
    liveNow: "Live now",
    recentResults: "Recent results",
    noStages: "Tournament stages have not been published yet.",
    noMatches: "The match schedule has not been published yet.",
    noTeams: "Participating teams have not been published yet.",
    noRoster: "Roster has not been published yet.",
    liveMatches: "Live matches",
    completedMatches: "Completed matches",
    upcomingMatches: "Upcoming matches",
    stageType: "Type",
    dates: "Dates",
    format: "Format",
    bestOf: "Best of",
    location: "Location",
    online: "Online",
    offline: "Offline",
    seed: "Seed",
    region: "Region",
    roster: "Roster",
    rosterCount: "Roster members",
    captain: "Captain",
    tbd: "TBD",
    tbdLong: "To be determined",
    watch: "Watch stream",
    vod: "Watch VOD",
    technicalReference: "Match reference",
    winner: "Winner",
    teamCount: "Teams",
    active: "Active",
    inactive: "Inactive",
    completed: "Completed",
    qualifier: "Qualifier",
    groupStage: "Group stage",
    playoffs: "Playoffs",
    final: "Final",
    other: "Other",
    players: "Players",
    substitutes: "Substitutes",
    coaches: "Coaches",
    managers: "Managers",
    round: "Round",
    group: "Group",
    scheduled: "Scheduled",
    invited: "Invited",
    registered: "Registered",
    confirmed: "Confirmed",
    eliminated: "Eliminated",
    withdrawn: "Withdrawn",
    disqualified: "Disqualified",
    swiss: "Swiss",
    singleElimination: "Single elimination",
    doubleElimination: "Double elimination",
    roundRobin: "Round robin",
    custom: "Custom",
    postponed: "Postponed",
    cancelled: "Cancelled",
    walkover: "W/O",
  },
  ru: {
    overview: "Обзор",
    stages: "Этапы",
    matches: "Матчи",
    teams: "Команды",
    bracket: "Сетка",
    standings: "Таблица",
    qualified: "Проходит дальше",
    note: "Примечание",
    bracketUpdating: "Сетка турнира ещё обновляется.",
    live: "Идёт сейчас",
    upcoming: "Предстоящие",
    results: "Результаты",
    unscheduled: "Без времени",
    nextMatch: "Следующий матч",
    liveNow: "Прямо сейчас",
    recentResults: "Последние результаты",
    noStages: "Этапы турнира пока не опубликованы.",
    noMatches: "Расписание матчей пока не опубликовано.",
    noTeams: "Участвующие команды пока не опубликованы.",
    noRoster: "Состав пока не опубликован.",
    liveMatches: "Матчи в прямом эфире",
    completedMatches: "Завершённые матчи",
    upcomingMatches: "Предстоящие матчи",
    stageType: "Тип",
    dates: "Даты",
    format: "Формат",
    bestOf: "До побед",
    location: "Место",
    online: "Онлайн",
    offline: "Офлайн",
    seed: "Посев",
    region: "Регион",
    roster: "Состав",
    rosterCount: "Участники состава",
    captain: "Капитан",
    tbd: "TBD",
    tbdLong: "Будет определено",
    watch: "Смотреть трансляцию",
    vod: "Смотреть запись",
    technicalReference: "Номер матча",
    winner: "Победитель",
    teamCount: "Команды",
    active: "Активен",
    inactive: "Неактивен",
    completed: "Завершён",
    qualifier: "Квалификация",
    groupStage: "Групповой этап",
    playoffs: "Плей-офф",
    final: "Финал",
    other: "Другое",
    players: "Игроки",
    substitutes: "Запасные",
    coaches: "Тренеры",
    managers: "Менеджеры",
    round: "Раунд",
    group: "Группа",
    scheduled: "Запланирован",
    invited: "Приглашена",
    registered: "Зарегистрирована",
    confirmed: "Подтверждена",
    eliminated: "Выбыла",
    withdrawn: "Снялась",
    disqualified: "Дисквалифицирована",
    swiss: "Швейцарская система",
    singleElimination: "Олимпийская система",
    doubleElimination: "Двойное выбывание",
    roundRobin: "Круговая система",
    custom: "Другое",
    postponed: "Перенесён",
    cancelled: "Отменён",
    walkover: "Техническая победа",
  },
} as const;

function TeamName({
  team,
  locale,
}: {
  team: PublicTeamSummary | null;
  locale: Locale;
}) {
  const current = copy[locale];
  if (!team)
    return (
      <span
        className="matchTbd"
        title={current.tbdLong}
        aria-label={current.tbdLong}
      >
        {current.tbd}
      </span>
    );
  return <span>{team.short_name ?? team.name}</span>;
}

function statusLabel(status: string, locale: Locale) {
  const current = copy[locale];
  if (status === "postponed") return current.postponed;
  if (status === "cancelled") return current.cancelled;
  if (status === "walkover") return current.walkover;
  if (status === "live") return current.live;
  if (status === "completed") return current.results;
  return current.upcoming;
}

function entityStatusLabel(status: string, locale: Locale) {
  const current = copy[locale];
  if (status === "scheduled") return current.scheduled;
  if (status === "active") return current.active;
  if (status === "inactive") return current.inactive;
  if (status === "completed") return current.completed;
  if (status === "cancelled") return current.cancelled;
  if (status === "invited") return current.invited;
  if (status === "registered") return current.registered;
  if (status === "confirmed") return current.confirmed;
  if (status === "eliminated") return current.eliminated;
  if (status === "withdrawn") return current.withdrawn;
  if (status === "disqualified") return current.disqualified;
  return current.other;
}

function stageTypeLabel(stageType: string, locale: Locale) {
  const current = copy[locale];
  if (stageType === "qualifier") return current.qualifier;
  if (stageType === "group_stage") return current.groupStage;
  if (stageType === "playoff") return current.playoffs;
  if (stageType === "final") return current.final;
  if (stageType === "swiss") return current.swiss;
  if (stageType === "single_elimination") return current.singleElimination;
  if (stageType === "double_elimination") return current.doubleElimination;
  if (stageType === "round_robin") return current.roundRobin;
  if (stageType === "custom") return current.custom;
  return current.other;
}

export function formatMatchDuration(seconds: number, locale: Locale) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (locale === "ru")
    return [hours ? `${hours} ч` : null, minutes ? `${minutes} мин` : null]
      .filter(Boolean)
      .join(" ");
  return [hours ? `${hours}h` : null, minutes ? `${minutes}m` : null]
    .filter(Boolean)
    .join(" ");
}

function MatchCard({ match, locale }: { match: PublicMatch; locale: Locale }) {
  const current = copy[locale];
  const stream = ["scheduled", "live", "postponed"].includes(match.status)
    ? safePublicUrl(match.stream_url)
    : null;
  const vod = ["completed", "walkover"].includes(match.status)
    ? safePublicUrl(match.vod_url)
    : null;
  const showScore = match.score_a !== null && match.score_b !== null;
  return (
    <article className="publicMatchCard">
      <header>
        <div>
          <p className="matchContext">{match.stage?.name ?? current.other}</p>
          <h4>{match.public_id}</h4>
        </div>
        <span className="matchStatus" data-status={match.status}>
          {statusLabel(match.status, locale)}
        </span>
      </header>
      <div className="matchTeams" aria-label={match.public_id}>
        <div
          className={
            match.winner?.slug === match.team_a?.slug
              ? "matchWinner"
              : undefined
          }
          aria-label={
            match.winner?.slug === match.team_a?.slug
              ? current.winner
              : undefined
          }
        >
          <TeamName team={match.team_a} locale={locale} />
          {showScore ? <strong>{match.score_a}</strong> : null}
        </div>
        <div>
          <TeamName team={match.team_b} locale={locale} />
          {showScore ? <strong>{match.score_b}</strong> : null}
        </div>
      </div>
      <div className="matchMeta">
        {match.scheduled_at ? (
          <time dateTime={match.scheduled_at}>
            {formatPublicDateTime(match.scheduled_at, locale, match.timezone)} ·{" "}
            {match.timezone}
          </time>
        ) : null}
        {match.round_name ? (
          <span>
            {current.round}: {match.round_name}
          </span>
        ) : null}
        {match.group_name ? (
          <span>
            {current.group}: {match.group_name}
          </span>
        ) : null}
        {match.best_of ? <span>BO{match.best_of}</span> : null}
        {match.duration_seconds &&
        ["completed", "walkover"].includes(match.status) ? (
          <span>{formatMatchDuration(match.duration_seconds, locale)}</span>
        ) : null}
      </div>
      {stream || vod || match.deadlock_match_id ? (
        <footer className="matchLinks">
          {stream ? (
            <a href={stream} target="_blank" rel="noopener noreferrer">
              {current.watch}
            </a>
          ) : null}
          {vod ? (
            <a href={vod} target="_blank" rel="noopener noreferrer">
              {current.vod}
            </a>
          ) : null}
          {match.deadlock_match_id ? (
            <span>
              {current.technicalReference}: {match.deadlock_match_id}
            </span>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function MatchGroup({
  title,
  matches,
  locale,
}: {
  title: string;
  matches: PublicMatch[];
  locale: Locale;
}) {
  if (!matches.length) return null;
  return (
    <section className="publicMatchGroup">
      <h3>{title}</h3>
      <div className="publicMatchGrid">
        {matches.map((match, index) => (
          <MatchCard
            key={`${match.public_id}-${index}`}
            match={match}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

export function PublicTournamentOperational({
  projection,
}: {
  projection: PublicTournamentProjection;
}) {
  const { locale, stages, teams, matches, summary } = projection;
  const brackets = projection.brackets ?? [];
  const standings = projection.standings ?? [];
  const current = copy[locale];
  const hasMatches = Object.values(matches).some((group) => group.length > 0);
  return (
    <div className="publicOperational">
      <nav className="publicSectionNav" aria-label="Tournament sections">
        <a href="#overview">{current.overview}</a>
        <a href="#matches">{current.matches}</a>
        <a href="#stages">{current.stages}</a>
        {brackets.length ? <a href="#bracket">{current.bracket}</a> : null}
        {standings.length ? <a href="#standings">{current.standings}</a> : null}
        <a href="#teams">{current.teams}</a>
      </nav>

      <section
        id="overview"
        className="publicOperationalSection"
        aria-labelledby="overview-heading"
      >
        <h2 id="overview-heading">{current.overview}</h2>
        <dl className="publicSummaryGrid">
          <div>
            <dt>{current.liveMatches}</dt>
            <dd>{summary.live_matches}</dd>
          </div>
          <div>
            <dt>{current.stages}</dt>
            <dd>{summary.stages}</dd>
          </div>
          <div>
            <dt>{current.teams}</dt>
            <dd>{summary.teams}</dd>
          </div>
          <div>
            <dt>{current.upcomingMatches}</dt>
            <dd>{summary.upcoming_matches}</dd>
          </div>
          <div>
            <dt>{current.completedMatches}</dt>
            <dd>{summary.completed_matches}</dd>
          </div>
        </dl>
        {summary.live_match ||
        summary.next_match ||
        summary.recent_results.length ? (
          <div className="publicHighlights">
            {summary.live_match ? (
              <div>
                <h3>{current.liveNow}</h3>
                <MatchCard match={summary.live_match} locale={locale} />
              </div>
            ) : null}
            {summary.next_match ? (
              <div>
                <h3>{current.nextMatch}</h3>
                <MatchCard match={summary.next_match} locale={locale} />
              </div>
            ) : null}
            {summary.recent_results.length ? (
              <div>
                <h3>{current.recentResults}</h3>
                <div className="publicMatchGrid">
                  {summary.recent_results.map((match, index) => (
                    <MatchCard
                      key={`${match.public_id}-recent-${index}`}
                      match={match}
                      locale={locale}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        id="stages"
        className="publicOperationalSection"
        aria-labelledby="stages-heading"
      >
        <h2 id="stages-heading">{current.stages}</h2>
        {stages.length ? (
          <div className="publicStageGrid">
            {stages.map((stage) => (
              <article
                id={`stage-${encodeURIComponent(stage.slug)}`}
                key={stage.slug}
                className="publicStageCard"
              >
                <header>
                  <span>{stage.sequence_number}</span>
                  <h3>{stage.name}</h3>
                  <span className="matchStatus">
                    {entityStatusLabel(stage.status, locale)}
                  </span>
                </header>
                <dl>
                  <div>
                    <dt>{current.stageType}</dt>
                    <dd>{stageTypeLabel(stage.stage_type, locale)}</dd>
                  </div>
                  {stage.start_at || stage.end_at ? (
                    <div>
                      <dt>{current.dates}</dt>
                      <dd>
                        {stage.start_at
                          ? formatPublicDateTime(
                              stage.start_at,
                              locale,
                              stage.timezone ?? projection.tournament.timezone,
                            )
                          : "—"}{" "}
                        –{" "}
                        {stage.end_at
                          ? formatPublicDateTime(
                              stage.end_at,
                              locale,
                              stage.timezone ?? projection.tournament.timezone,
                            )
                          : "—"}
                      </dd>
                    </div>
                  ) : null}
                  {stage.format_text ? (
                    <div>
                      <dt>{current.format}</dt>
                      <dd>{stage.format_text}</dd>
                    </div>
                  ) : null}
                  {stage.best_of_default ? (
                    <div>
                      <dt>{current.bestOf}</dt>
                      <dd>BO{stage.best_of_default}</dd>
                    </div>
                  ) : null}
                  {stage.team_count ? (
                    <div>
                      <dt>{current.teamCount}</dt>
                      <dd>{stage.team_count}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{current.location}</dt>
                    <dd>
                      {stage.is_online === false
                        ? (stage.location_name ?? current.offline)
                        : current.online}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="publicEmptyState">{current.noStages}</p>
        )}
      </section>

      <section
        id="matches"
        className="publicOperationalSection"
        aria-labelledby="matches-heading"
      >
        <h2 id="matches-heading">{current.matches}</h2>
        {hasMatches ? (
          <>
            <MatchGroup
              title={current.live}
              matches={matches.live}
              locale={locale}
            />
            <MatchGroup
              title={current.upcoming}
              matches={matches.upcoming}
              locale={locale}
            />
            <MatchGroup
              title={current.results}
              matches={matches.results}
              locale={locale}
            />
            <MatchGroup
              title={current.unscheduled}
              matches={matches.unscheduled}
              locale={locale}
            />
          </>
        ) : (
          <p className="publicEmptyState">{current.noMatches}</p>
        )}
      </section>

      {brackets.length ? (
        <section
          id="bracket"
          className="publicOperationalSection"
          aria-labelledby="bracket-heading"
        >
          <h2 id="bracket-heading">{current.bracket}</h2>
          {brackets.map((bracket) => (
            <article key={bracket.stage.slug} className="publicBracket">
              <h3>{bracket.stage.name}</h3>
              {bracket.links.length === 0 ||
              bracket.matches.some(
                (match) => !match.team_a || !match.team_b,
              ) ? (
                <p className="publicEmptyState">{current.bracketUpdating}</p>
              ) : null}
              <div className="publicBracketRounds">
                {[
                  ...new Set(
                    bracket.matches.map(
                      (match) =>
                        `${match.bracket_section}:${match.bracket_round}`,
                    ),
                  ),
                ].map((round) => (
                  <section key={round}>
                    <h4>{round.replace(":", " · ")}</h4>
                    {bracket.matches
                      .filter(
                        (match) =>
                          `${match.bracket_section}:${match.bracket_round}` ===
                          round,
                      )
                      .sort(
                        (a, b) =>
                          (a.bracket_position ?? 0) - (b.bracket_position ?? 0),
                      )
                      .map((match) => (
                        <MatchCard
                          key={match.public_id}
                          match={match}
                          locale={locale}
                        />
                      ))}
                  </section>
                ))}
              </div>
              {bracket.links.length ? (
                <ul
                  className="publicBracketLinks"
                  aria-label="Advancement paths"
                >
                  {bracket.links.map((link, index) => (
                    <li key={`${link.source}-${index}`}>
                      {link.source} {link.outcome} → {link.target}{" "}
                      {link.target_slot}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {standings.length ? (
        <section
          id="standings"
          className="publicOperationalSection"
          aria-labelledby="standings-heading"
        >
          <h2 id="standings-heading">{current.standings}</h2>
          {standings.map((stage) => (
            <article key={stage.stage.slug}>
              <h3>{stage.stage.name}</h3>
              {stage.groups.map((group) => (
                <div key={group.name} className="standingsTableWrap">
                  <h4>
                    {current.group} {group.name}
                  </h4>
                  <table className="standingsTable">
                    <caption>
                      {stage.stage.name} · {current.group} {group.name}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">{current.teams}</th>
                        <th scope="col">P</th>
                        <th scope="col">W</th>
                        <th scope="col">L</th>
                        <th scope="col">+/-</th>
                        <th scope="col">Pts</th>
                        <th scope="col">{current.qualified}</th>
                        <th scope="col">{current.note}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.team_slug}>
                          <td>{row.rank}</td>
                          <th scope="row">{row.team_name}</th>
                          <td>{row.played}</td>
                          <td>{row.wins}</td>
                          <td>{row.losses}</td>
                          <td>{row.score_diff}</td>
                          <td>{row.points}</td>
                          <td>{row.qualified ? "✓" : ""}</td>
                          <td>{row.public_note ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </article>
          ))}
        </section>
      ) : null}

      <section
        id="teams"
        className="publicOperationalSection"
        aria-labelledby="teams-heading"
      >
        <h2 id="teams-heading">{current.teams}</h2>
        {teams.length ? (
          <div className="publicTeamGrid">
            {teams.map((team) => {
              const logo = safePublicUrl(team.logo_url);
              return (
                <article key={team.slug} className="publicTeamCard">
                  <header>
                    {logo ? (
                      // Team logos are organizer-controlled remote URLs without a fixed host allowlist.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo}
                        alt=""
                        width="48"
                        height="48"
                        loading="lazy"
                      />
                    ) : (
                      <span className="teamMonogram" aria-hidden="true">
                        {(team.short_name ?? team.name)
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                    <div>
                      <h3>{team.name}</h3>
                      {team.short_name ? <p>{team.short_name}</p> : null}
                    </div>
                    <span className="matchStatus">
                      {entityStatusLabel(team.status, locale)}
                    </span>
                  </header>
                  <dl className="teamFacts">
                    {team.region ? (
                      <div>
                        <dt>{current.region}</dt>
                        <dd>{team.region}</dd>
                      </div>
                    ) : null}
                    {team.seed ? (
                      <div>
                        <dt>{current.seed}</dt>
                        <dd>{team.seed}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>{current.rosterCount}</dt>
                      <dd>{team.roster.length}</dd>
                    </div>
                  </dl>
                  <h4>{current.roster}</h4>
                  {team.roster.length ? (
                    <div className="publicRosterGroups">
                      {(
                        [
                          [
                            current.captain,
                            team.roster.filter((member) => member.is_captain),
                          ],
                          [
                            current.players,
                            team.roster.filter(
                              (member) =>
                                member.role === "player" && !member.is_captain,
                            ),
                          ],
                          [
                            current.substitutes,
                            team.roster.filter(
                              (member) =>
                                member.role === "substitute" &&
                                !member.is_captain,
                            ),
                          ],
                          [
                            current.coaches,
                            team.roster.filter(
                              (member) =>
                                member.role === "coach" && !member.is_captain,
                            ),
                          ],
                          [
                            current.managers,
                            team.roster.filter(
                              (member) =>
                                member.role === "manager" && !member.is_captain,
                            ),
                          ],
                        ] as const
                      ).map(([label, members]) =>
                        members.length ? (
                          <section key={label} className="publicRosterGroup">
                            <h5>{label}</h5>
                            <ul className="publicRoster">
                              {members.map((member, index) => (
                                <li
                                  key={`${member.display_name}-${member.role}-${index}`}
                                >
                                  <span>
                                    {member.country_code
                                      ? `${member.country_code} · `
                                      : ""}
                                    {member.display_name}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ) : null,
                      )}
                    </div>
                  ) : (
                    <p className="publicEmptyState">{current.noRoster}</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="publicEmptyState">{current.noTeams}</p>
        )}
      </section>
    </div>
  );
}
