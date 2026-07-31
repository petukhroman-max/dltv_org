import Link from "next/link";

import {
  formatPublicDate,
  formatPublicDateTime,
} from "@/lib/public-tournaments/presentation";
import { getTournamentLifecycle } from "@/lib/public-tournaments/lifecycle";
import type { PublishedTournament } from "@/lib/public-tournaments/public-tournaments.types";

export function TournamentCard({
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
  const deadlineIsRelevant =
    tournament.registration_deadline &&
    new Date(tournament.registration_deadline).getTime() > Date.now();

  return (
    <article className="tournamentCard">
      <div className="tournamentCardHeading">
        <span className="lifecycleBadge" data-lifecycle={lifecycle}>
          {lifecycle}
        </span>
        <span>{tournament.is_online ? "Online" : "Offline"}</span>
      </div>
      <h2>{tournament.tournament_name}</h2>
      <p className="supportingText">By {tournament.organizer_name}</p>
      <dl className="tournamentFacts">
        <div>
          <dt>Region</dt>
          <dd>{tournament.region}</dd>
        </div>
        <div>
          <dt>Dates</dt>
          <dd>
            <time dateTime={tournament.start_date}>
              {formatPublicDate(tournament.start_date)}
            </time>{" "}
            –{" "}
            <time dateTime={tournament.end_date}>
              {formatPublicDate(tournament.end_date)}
            </time>
          </dd>
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
        {deadlineIsRelevant ? (
          <div>
            <dt>Registration deadline</dt>
            <dd>
              <time dateTime={tournament.registration_deadline!}>
                {formatPublicDateTime(tournament.registration_deadline!)}
              </time>
            </dd>
          </div>
        ) : null}
      </dl>
      <Link className="primaryButton" href={`/tournaments/${tournament.slug}`}>
        View tournament
      </Link>
    </article>
  );
}
