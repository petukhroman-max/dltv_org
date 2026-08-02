import type { Metadata } from "next";
import Link from "next/link";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { TournamentCard } from "@/components/public/tournament-card";
import { EmptyState } from "@/components/ui/empty-state";
import { localizePath, type Locale } from "@/i18n/config";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { absolutePublicUrl } from "@/lib/public-tournaments/seo";
import { listPublishedTournaments } from "@/lib/public-tournaments/public-tournaments.repository";
import type { TournamentLifecycle } from "@/lib/public-tournaments/public-tournaments.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const path = localizePath(locale, "/tournaments");
  return {
    title: `${dictionary.catalog.title} | DLTV`,
    description: dictionary.catalog.description,
    alternates: {
      canonical: absolutePublicUrl(path),
      languages: {
        en: absolutePublicUrl("/en/tournaments"),
        ru: absolutePublicUrl("/ru/tournaments"),
      },
    },
  };
}

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function catalogHref(
  locale: Locale,
  lifecycle: string,
  region: string,
  page?: number,
) {
  const params = new URLSearchParams();
  if (lifecycle !== "all") params.set("lifecycle", lifecycle);
  if (region) params.set("region", region);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  const path = localizePath(locale, "/tournaments");
  return query ? `${path}?${query}` : path;
}

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const copy = dictionary.catalog;
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
      <>
        <PublicHeader active="tournaments" locale={locale} />
        <main className="catalogShell">
          <h1>{copy.title}</h1>
          <p className="formError" role="alert">
            {copy.unavailable}
          </p>
        </main>
        <PublicFooter locale={locale} />
      </>
    );
  }

  return (
    <>
      <PublicHeader active="tournaments" locale={locale} />
      <main className="catalogShell">
        <header className="catalogHeader">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="description">{copy.description}</p>
          <div className="contextualActions">
            <Link
              className="secondaryButton"
              href={localizePath(locale, "/submit-tournament")}
            >
              {dictionary.nav.submit}
            </Link>
          </div>
        </header>
        <nav className="lifecycleFilters" aria-label={copy.lifecycle}>
          {["all", "upcoming", "ongoing", "completed"].map((value) => (
            <Link
              key={value}
              href={catalogHref(locale, value, region)}
              aria-current={lifecycle === value ? "page" : undefined}
            >
              {copy[value as "all" | TournamentLifecycle]}
            </Link>
          ))}
        </nav>
        <form className="regionFilter" method="get">
          {lifecycle !== "all" ? (
            <input type="hidden" name="lifecycle" value={lifecycle} />
          ) : null}
          <label htmlFor="region">{copy.region}</label>
          <input
            id="region"
            name="region"
            type="text"
            maxLength={100}
            defaultValue={region}
          />
          <button className="secondaryButton" type="submit">
            {dictionary.common.apply}
          </button>
          {region ? (
            <Link
              className="textLink"
              href={catalogHref(locale, lifecycle, "")}
            >
              {copy.clearRegion}
            </Link>
          ) : null}
        </form>
        {result.tournaments.length === 0 ? (
          <EmptyState
            title={copy.emptyTitle}
            description={copy.emptyDescription}
          />
        ) : (
          <section
            className="tournamentGrid"
            aria-label="Published tournaments"
          >
            {result.tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                today={today}
                locale={locale}
              />
            ))}
          </section>
        )}
        {result.totalPages > 1 ? (
          <nav className="adminPagination" aria-label={copy.pagination}>
            {result.page > 1 ? (
              <Link
                className="secondaryButton"
                rel="prev"
                href={catalogHref(locale, lifecycle, region, result.page - 1)}
              >
                {dictionary.common.previous}
              </Link>
            ) : (
              <span />
            )}
            <span>
              {copy.page
                .replace("{page}", String(result.page))
                .replace("{total}", String(result.totalPages))}
            </span>
            {result.page < result.totalPages ? (
              <Link
                className="secondaryButton"
                rel="next"
                href={catalogHref(locale, lifecycle, region, result.page + 1)}
              >
                {dictionary.common.next}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </main>
      <PublicFooter locale={locale} />
    </>
  );
}
