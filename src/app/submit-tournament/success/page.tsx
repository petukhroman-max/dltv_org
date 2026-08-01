import Link from "next/link";
import { z } from "zod";

import { PublicHeader } from "@/components/public/public-header";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getPublicSubmissionCopy } from "@/lib/submissions/public-submission.copy";

export default async function SubmissionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale = await getRequestLocale();
  const copy = getPublicSubmissionCopy(locale);
  const rawId = Array.isArray(params.id) ? undefined : params.id;
  const parsedId = z.uuid().safeParse(rawId);

  return (
    <>
      <PublicHeader active="submit" locale={locale} />
      <main className="shell publicMain">
        <section className="successCard" aria-labelledby="success-title">
          <p className="eyebrow">{copy.success.eyebrow}</p>
          <h1 id="success-title">{copy.success.title}</h1>
          {parsedId.success ? (
            <>
              <div className="statusRow">
                <span>{copy.success.statusLabel}</span>
                <strong>{copy.success.status}</strong>
              </div>
              <div className="referenceBlock">
                <span>{copy.success.referenceLabel}</span>
                <code>{parsedId.data}</code>
              </div>
              <p className="description">{copy.success.review}</p>
              <p className="supportingText">{copy.success.saveReference}</p>
            </>
          ) : (
            <p className="formError" role="alert">
              {copy.success.invalidReference}
            </p>
          )}
          <div className="formActions">
            <Link
              className="primaryButton"
              href={localizePath(locale, "/submit-tournament")}
            >
              {copy.success.another}
            </Link>
            <Link
              className="textLink"
              href={localizePath(locale, "/tournaments")}
            >
              {copy.success.browse}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
