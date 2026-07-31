import type { Metadata } from "next";
import Link from "next/link";

import { TournamentCard } from "@/components/public/tournament-card";
import { absolutePublicUrl } from "@/lib/public-tournaments/seo";
import { listPublishedTournaments } from "@/lib/public-tournaments/public-tournaments.repository";
import type { TournamentLifecycle } from "@/lib/public-tournaments/public-tournaments.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Deadlock tournaments | DLTV",
  description:
    "Browse upcoming, ongoing, and completed Deadlock tournaments published by DLTV.",
  alternates: { canonical: absolutePublicUrl("/tournaments") },
};

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function catalogHref(lifecycle: string, region: string, page?: number) {
  const params = new URLSearchParams();
  if (lifecycle !== "all") params.set("lifecycle", lifecycle);
  if (region) params.set("region", region);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/tournaments?${query}` : "/tournaments";
}

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedLifecycle = firstString(params.lifecycle);
  const lifecycle: TournamentLifecycle | "all" = [
    "upcoming",
    "ongoing",
    "completed",
  ].includes(requestedLifecycle ?? "")
    ? (requestedLifecycle as TournamentLifecycle)
    : "all";
  const region = firstString(params.region)?.trim() ?? "";
  const rawPage = Number(firstString(params.page) ?? "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const today = new Date().toISOString().slice(0, 10);

  let result;
  try {
    result = await listPublishedTournaments(
      { lifecycle, region: region || undefined, page, limit: 20 },
      undefined,
      today,
    );
  } catch {
    return (
      <main className="catalogShell">
        <p className="formError" role="alert">
          Tournaments are temporarily unavailable. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="catalogShell">
      <header className="catalogHeader">
        <p className="eyebrow">DLTV public catalog</p>
        <h1>Deadlock tournaments</h1>
        <p className="description">
          Discover upcoming events, follow tournaments in progress, and browse
          recently completed competitions.
        </p>
      </header>
      <nav className="lifecycleFilters" aria-label="Tournament lifecycle">
        {["all", "upcoming", "ongoing", "completed"].map((value) => (
          <Link
            key={value}
            href={catalogHref(value, region)}
            aria-current={lifecycle === value ? "page" : undefined}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </Link>
        ))}
      </nav>
      <form className="regionFilter" method="get">
        {lifecycle !== "all" ? (
          <input type="hidden" name="lifecycle" value={lifecycle} />
        ) : null}
        <label htmlFor="region">Region</label>
        <input
          id="region"
          name="region"
          type="text"
          maxLength={100}
          defaultValue={region}
        />
        <button className="secondaryButton" type="submit">
          Apply
        </button>
        {region ? (
          <Link className="textLink" href={catalogHref(lifecycle, "")}>
            Clear region
          </Link>
        ) : null}
      </form>
      {result.tournaments.length === 0 ? (
        <p className="adminEmpty">No tournaments have been published yet.</p>
      ) : (
        <section className="tournamentGrid" aria-label="Published tournaments">
          {result.tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              today={today}
            />
          ))}
        </section>
      )}
      {result.totalPages > 1 ? (
        <nav className="adminPagination" aria-label="Tournament pages">
          {result.page > 1 ? (
            <Link
              className="secondaryButton"
              rel="prev"
              href={catalogHref(lifecycle, region, result.page - 1)}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link
              className="secondaryButton"
              rel="next"
              href={catalogHref(lifecycle, region, result.page + 1)}
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
