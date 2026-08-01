import Link from "next/link";
import type { Metadata } from "next";

import { PublicHeader } from "@/components/public/public-header";
import { localizePath } from "@/i18n/config";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { absolutePublicUrl } from "@/lib/public-tournaments/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  return {
    title: dictionary.common.brand,
    description: dictionary.home.description,
    alternates: {
      canonical: absolutePublicUrl(`/${locale}`),
      languages: { en: absolutePublicUrl("/en"), ru: absolutePublicUrl("/ru") },
    },
  };
}

export default async function Home() {
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  return (
    <>
      <PublicHeader locale={locale} />
      <main className="shell publicMain">
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">{dictionary.home.eyebrow}</p>
          <h1 id="page-title">{dictionary.home.title}</h1>
          <p className="description">{dictionary.home.description}</p>
          <div className="heroActions">
            <Link
              className="primaryButton"
              href={localizePath(locale, "/submit-tournament")}
            >
              {dictionary.nav.submit}
            </Link>
            <Link
              className="secondaryButton"
              href={localizePath(locale, "/tournaments")}
            >
              {dictionary.nav.tournaments}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
