import type { Metadata } from "next";

import { TournamentSubmissionForm } from "@/components/forms/tournament-submission-form";
import { PublicHeader } from "@/components/public/public-header";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getPublicSubmissionCopy } from "@/lib/submissions/public-submission.copy";
import { absolutePublicUrl } from "@/lib/public-tournaments/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getPublicSubmissionCopy(locale);
  return {
    title: `${copy.form.title} | DLTV`,
    description: copy.form.intro,
    alternates: {
      canonical: absolutePublicUrl(`/${locale}/submit-tournament`),
      languages: {
        en: absolutePublicUrl("/en/submit-tournament"),
        ru: absolutePublicUrl("/ru/submit-tournament"),
      },
    },
  };
}

export default async function SubmitTournamentPage() {
  const locale = await getRequestLocale();
  const copy = getPublicSubmissionCopy(locale);
  return (
    <>
      <PublicHeader active="submit" locale={locale} />
      <main className="formShell">
        <header className="pageHeader">
          <p className="eyebrow">{copy.form.eyebrow}</p>
          <h1>{copy.form.title}</h1>
          <p className="description">{copy.form.intro}</p>
        </header>
        <TournamentSubmissionForm renderedAt={Date.now()} locale={locale} />
      </main>
    </>
  );
}
