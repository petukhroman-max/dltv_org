import Link from "next/link";

import { publicSubmissionCopy } from "@/lib/submissions/public-submission.copy";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">{publicSubmissionCopy.home.eyebrow}</p>
        <h1 id="page-title">{publicSubmissionCopy.home.title}</h1>
        <p className="description">{publicSubmissionCopy.home.description}</p>
        <div className="heroActions">
          <Link className="primaryButton" href="/submit-tournament">
            {publicSubmissionCopy.home.action}
          </Link>
          <Link className="secondaryButton" href="/tournaments">
            Browse tournaments
          </Link>
        </div>
      </section>
    </main>
  );
}
