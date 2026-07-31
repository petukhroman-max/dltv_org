import Link from "next/link";
import { z } from "zod";

import { publicSubmissionCopy } from "@/lib/submissions/public-submission.copy";

export default async function SubmissionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawId = Array.isArray(params.id) ? undefined : params.id;
  const parsedId = z.uuid().safeParse(rawId);

  return (
    <main className="shell">
      <section className="successCard" aria-labelledby="success-title">
        <p className="eyebrow">{publicSubmissionCopy.success.eyebrow}</p>
        <h1 id="success-title">{publicSubmissionCopy.success.title}</h1>
        {parsedId.success ? (
          <>
            <div className="statusRow">
              <span>{publicSubmissionCopy.success.statusLabel}</span>
              <strong>{publicSubmissionCopy.success.status}</strong>
            </div>
            <div className="referenceBlock">
              <span>{publicSubmissionCopy.success.referenceLabel}</span>
              <code>{parsedId.data}</code>
            </div>
            <p className="description">{publicSubmissionCopy.success.review}</p>
            <p className="supportingText">
              {publicSubmissionCopy.success.saveReference}
            </p>
          </>
        ) : (
          <p className="formError" role="alert">
            {publicSubmissionCopy.success.invalidReference}
          </p>
        )}
        <div className="formActions">
          <Link className="primaryButton" href="/submit-tournament">
            {publicSubmissionCopy.success.another}
          </Link>
          <Link className="textLink" href="/">
            {publicSubmissionCopy.success.home}
          </Link>
        </div>
      </section>
    </main>
  );
}
