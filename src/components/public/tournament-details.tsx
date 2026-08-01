import {
  formatPublicDate,
  formatPublicDateTime,
  safePublicUrl,
} from "@/lib/public-tournaments/presentation";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getTournamentLifecycle } from "@/lib/public-tournaments/lifecycle";
import type { PublicTournamentOverview } from "@/lib/public-tournaments/public-operational.types";

export function TournamentDetails({
  tournament,
  today,
  locale = "en",
}: {
  tournament: PublicTournamentOverview;
  today: string;
  locale?: Locale;
}) {
  const copy = getDictionary(locale).catalog;
  const links = [
    [copy.register, "registration_url"],
    [copy.bracket, "bracket_url"],
    [copy.discord, "discord_url"],
    [copy.stream, "stream_url"],
    [copy.rules, "rules_url"],
  ] as const;
  const lifecycle = getTournamentLifecycle(
    tournament.start_date,
    tournament.end_date,
    today,
  );
  return (
    <article className="publicTournamentDetails">
      <header className="pageHeader">
        <p className="eyebrow">{copy.eventEyebrow}</p>
        <h1>{tournament.tournament_name}</h1>
        <p className="description">
          {copy.organizedBy} {tournament.organizer_name}
        </p>
        <span className="lifecycleBadge" data-lifecycle={lifecycle}>
          {copy[lifecycle]}
        </span>
      </header>
      <section className="formSection" aria-labelledby="details-heading">
        <h2 id="details-heading">{copy.details}</h2>
        <dl className="tournamentDetailGrid">
          <div>
            <dt>{copy.region}</dt>
            <dd>{tournament.region}</dd>
          </div>
          {tournament.language ? (
            <div>
              <dt>{copy.language}</dt>
              <dd>{tournament.language}</dd>
            </div>
          ) : null}
          <div>
            <dt>{copy.starts}</dt>
            <dd>
              <time dateTime={tournament.start_date}>
                {formatPublicDate(tournament.start_date, locale)}
              </time>
            </dd>
          </div>
          <div>
            <dt>{copy.ends}</dt>
            <dd>
              <time dateTime={tournament.end_date}>
                {formatPublicDate(tournament.end_date, locale)}
              </time>
            </dd>
          </div>
          <div>
            <dt>{copy.timezone}</dt>
            <dd>{tournament.timezone}</dd>
          </div>
          <div>
            <dt>{copy.location}</dt>
            <dd>{tournament.is_online ? copy.online : copy.offline}</dd>
          </div>
          {tournament.format ? (
            <div>
              <dt>{copy.format}</dt>
              <dd>{tournament.format}</dd>
            </div>
          ) : null}
          {tournament.prize_pool_text ? (
            <div>
              <dt>{copy.prizePool}</dt>
              <dd>{tournament.prize_pool_text}</dd>
            </div>
          ) : null}
          {tournament.max_teams ? (
            <div>
              <dt>{copy.maximumTeams}</dt>
              <dd>{tournament.max_teams}</dd>
            </div>
          ) : null}
          {tournament.registration_deadline ? (
            <div>
              <dt>{copy.registrationDeadline}</dt>
              <dd>
                <time dateTime={tournament.registration_deadline}>
                  {formatPublicDateTime(
                    tournament.registration_deadline,
                    locale,
                  )}
                </time>
              </dd>
            </div>
          ) : null}
        </dl>
        {tournament.description ? (
          <div className="tournamentDescription">
            <h2>{copy.about}</h2>
            <p>{tournament.description}</p>
          </div>
        ) : null}
      </section>
      <section className="formSection" aria-labelledby="links-heading">
        <h2 id="links-heading">{copy.links}</h2>
        <div className="publicLinkGrid">
          {links.map(([label, field]) => {
            const url = safePublicUrl(tournament[field]);
            return url ? (
              <a
                className="secondaryButton"
                key={field}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ) : null;
          })}
        </div>
      </section>
      <footer className="provenance">
        <p>{copy.providedBy}</p>
        <p>{copy.publishedBy}</p>
        <p>
          {copy.lastUpdated}:{" "}
          <time dateTime={tournament.source_updated_at}>
            {formatPublicDateTime(tournament.source_updated_at, locale)}
          </time>
        </p>
      </footer>
    </article>
  );
}
