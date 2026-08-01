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
    live: "Live",
    upcoming: "Upcoming",
    results: "Results",
    unscheduled: "Unscheduled",
    nextMatch: "Next match",
    liveNow: "Live now",
    recentResults: "Recent results",
    noStages: "No public stages yet.",
    noMatches: "No public matches yet.",
    noTeams: "No public teams yet.",
    noRoster: "Roster has not been published.",
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
    player: "Player",
    substitute: "Substitute",
    coach: "Coach",
    manager: "Manager",
    postponed: "Postponed",
    cancelled: "Cancelled",
    walkover: "W/O",
  },
  ru: {
    overview: "Обзор",
    stages: "Этапы",
    matches: "Матчи",
    teams: "Команды",
    live: "Сейчас",
    upcoming: "Предстоящие",
    results: "Результаты",
    unscheduled: "Без времени",
    nextMatch: "Следующий матч",
    liveNow: "Прямо сейчас",
    recentResults: "Последние результаты",
    noStages: "Публичных этапов пока нет.",
    noMatches: "Публичных матчей пока нет.",
    noTeams: "Публичных команд пока нет.",
    noRoster: "Состав пока не опубликован.",
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
    player: "Игрок",
    substitute: "Запасной",
    coach: "Тренер",
    manager: "Менеджер",
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
  if (status === "active") return current.active;
  if (status === "inactive") return current.inactive;
  if (status === "completed") return current.completed;
  return status;
}

function stageTypeLabel(stageType: string, locale: Locale) {
  const current = copy[locale];
  if (stageType === "qualifier") return current.qualifier;
  if (stageType === "group_stage") return current.groupStage;
  if (stageType === "playoff") return current.playoffs;
  if (stageType === "final") return current.final;
  return current.other;
}

function roleLabel(role: string, locale: Locale) {
  const current = copy[locale];
  if (role === "player") return current.player;
  if (role === "substitute") return current.substitute;
  if (role === "coach") return current.coach;
  if (role === "manager") return current.manager;
  return role;
}

function MatchCard({ match, locale }: { match: PublicMatch; locale: Locale }) {
  const current = copy[locale];
  const stream = safePublicUrl(match.stream_url);
  const vod = safePublicUrl(match.vod_url);
  const showScore = match.score_a !== null && match.score_b !== null;
  return (
    <article className="publicMatchCard">
      <header>
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
          <p className="matchContext">
            {match.stage?.name ?? match.round_name ?? match.group_name}
          </p>
          <h4>{match.public_id}</h4>
        </div>
        <span className="matchStatus" data-status={match.status}>
          {statusLabel(match.status, locale)}
        </span>
      </header>
      <div className="matchTeams" aria-label={match.public_id}>
        <div
          className={
            match.winner?.slug === match.team_b?.slug
              ? "matchWinner"
              : undefined
          }
          aria-label={
            match.winner?.slug === match.team_b?.slug
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
            {formatPublicDateTime(match.scheduled_at, locale)} ·{" "}
            {match.timezone}
          </time>
        ) : null}
        {match.best_of ? <span>BO{match.best_of}</span> : null}
        {match.duration_seconds ? (
          <span>{Math.ceil(match.duration_seconds / 60)} min</span>
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
  const current = copy[locale];
  const hasMatches = Object.values(matches).some((group) => group.length > 0);
  return (
    <div className="publicOperational">
      <nav className="publicSectionNav" aria-label="Tournament sections">
        <a href="#overview">{current.overview}</a>
        <a href="#stages">{current.stages}</a>
        <a href="#matches">{current.matches}</a>
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
                          ? formatPublicDateTime(stage.start_at, locale)
                          : "—"}{" "}
                        –{" "}
                        {stage.end_at
                          ? formatPublicDateTime(stage.end_at, locale)
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
                  </dl>
                  <h4>{current.roster}</h4>
                  {team.roster.length ? (
                    <ul className="publicRoster">
                      {team.roster.map((member, index) => (
                        <li
                          key={`${member.display_name}-${member.role}-${index}`}
                        >
                          <span>
                            {member.country_code
                              ? `${member.country_code} · `
                              : ""}
                            {member.display_name}
                          </span>
                          <small>
                            {roleLabel(member.role, locale)}
                            {member.is_captain ? ` · ${current.captain}` : ""}
                          </small>
                        </li>
                      ))}
                    </ul>
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
