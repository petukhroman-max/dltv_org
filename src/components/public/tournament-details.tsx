import {
  formatPublicDate,
  formatPublicDateTime,
  safePublicUrl,
} from "@/lib/public-tournaments/presentation";
import { getTournamentLifecycle } from "@/lib/public-tournaments/lifecycle";
import type { PublishedTournament } from "@/lib/public-tournaments/public-tournaments.types";

const links = [
  ["Register", "registration_url"],
  ["Bracket", "bracket_url"],
  ["Discord", "discord_url"],
  ["Watch stream", "stream_url"],
  ["Rules", "rules_url"],
] as const;

export function TournamentDetails({
  tournament,
  today,
}: {
  tournament: PublishedTournament;
  today: string;
}) {
  const lifecycle = getTournamentLifecycle(
    tournament.start_date,
    tournament.end_date,
    today,
  );
  return (
    <article className="publicTournamentDetails">
      <header className="pageHeader">
        <p className="eyebrow">Deadlock tournament</p>
        <h1>{tournament.tournament_name}</h1>
        <p className="description">Organized by {tournament.organizer_name}</p>
        <span className="lifecycleBadge" data-lifecycle={lifecycle}>
          {lifecycle}
        </span>
      </header>
      <section className="formSection" aria-labelledby="details-heading">
        <h2 id="details-heading">Tournament details</h2>
        <dl className="tournamentDetailGrid">
          <div>
            <dt>Region</dt>
            <dd>{tournament.region}</dd>
          </div>
          {tournament.language ? (
            <div>
              <dt>Language</dt>
              <dd>{tournament.language}</dd>
            </div>
          ) : null}
          <div>
            <dt>Starts</dt>
            <dd>
              <time dateTime={tournament.start_date}>
                {formatPublicDate(tournament.start_date)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Ends</dt>
            <dd>
              <time dateTime={tournament.end_date}>
                {formatPublicDate(tournament.end_date)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>{tournament.timezone}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{tournament.is_online ? "Online" : "Offline"}</dd>
          </div>
          {tournament.format ? (
            <div>
              <dt>Format</dt>
              <dd>{tournament.format}</dd>
            </div>
          ) : null}
          {tournament.prize_pool_text ? (
            <div>
              <dt>Prize pool</dt>
              <dd>{tournament.prize_pool_text}</dd>
            </div>
          ) : null}
          {tournament.max_teams ? (
            <div>
              <dt>Maximum teams</dt>
              <dd>{tournament.max_teams}</dd>
            </div>
          ) : null}
          {tournament.registration_deadline ? (
            <div>
              <dt>Registration deadline</dt>
              <dd>
                <time dateTime={tournament.registration_deadline}>
                  {formatPublicDateTime(tournament.registration_deadline)}
                </time>
              </dd>
            </div>
          ) : null}
        </dl>
        {tournament.description ? (
          <div className="tournamentDescription">
            <h2>About</h2>
            <p>{tournament.description}</p>
          </div>
        ) : null}
      </section>
      <section className="formSection" aria-labelledby="links-heading">
        <h2 id="links-heading">Tournament links</h2>
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
        <p>Information provided by the tournament organizer.</p>
        <p>Published by DLTV / Deadlock One.</p>
        <p>
          Last updated:{" "}
          <time dateTime={tournament.source_updated_at}>
            {formatPublicDateTime(tournament.source_updated_at)}
          </time>
        </p>
      </footer>
    </article>
  );
}
