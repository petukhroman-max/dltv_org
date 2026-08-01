import Link from "next/link";

import { localizePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  formatPublicDate,
  formatPublicDateTime,
} from "@/lib/public-tournaments/presentation";
import { getTournamentLifecycle } from "@/lib/public-tournaments/lifecycle";
import type { PublishedTournament } from "@/lib/public-tournaments/public-tournaments.types";

export function TournamentCard({
  tournament,
  today,
  locale = "en",
}: {
  tournament: PublishedTournament;
  today: string;
  locale?: Locale;
}) {
  const copy = getDictionary(locale).catalog;
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
          {copy[lifecycle]}
        </span>
        <span>{tournament.is_online ? copy.online : copy.offline}</span>
      </div>
      <h2>{tournament.tournament_name}</h2>
      <p className="supportingText">
        {copy.by} {tournament.organizer_name}
      </p>
      <dl className="tournamentFacts">
        <div>
          <dt>{copy.region}</dt>
          <dd>{tournament.region}</dd>
        </div>
        <div>
          <dt>{copy.dates}</dt>
          <dd>
            <time dateTime={tournament.start_date}>
              {formatPublicDate(tournament.start_date, locale)}
            </time>{" "}
            –{" "}
            <time dateTime={tournament.end_date}>
              {formatPublicDate(tournament.end_date, locale)}
            </time>
          </dd>
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
        {deadlineIsRelevant ? (
          <div>
            <dt>{copy.registrationDeadline}</dt>
            <dd>
              <time dateTime={tournament.registration_deadline!}>
                {formatPublicDateTime(
                  tournament.registration_deadline!,
                  locale,
                )}
              </time>
            </dd>
          </div>
        ) : null}
      </dl>
      <Link
        className="primaryButton"
        href={localizePath(locale, `/tournaments/${tournament.slug}`)}
      >
        {copy.view}
      </Link>
    </article>
  );
}
