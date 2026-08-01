import { TournamentSubmissionForm } from "@/components/forms/tournament-submission-form";
import { PublicHeader } from "@/components/public/public-header";
import { publicSubmissionCopy } from "@/lib/submissions/public-submission.copy";

export const dynamic = "force-dynamic";

export default function SubmitTournamentPage() {
  return (
    <>
      <PublicHeader active="submit" />
      <main className="formShell">
        <header className="pageHeader">
          <p className="eyebrow">{publicSubmissionCopy.form.eyebrow}</p>
          <h1>{publicSubmissionCopy.form.title}</h1>
          <p className="description">{publicSubmissionCopy.form.intro}</p>
        </header>
        <TournamentSubmissionForm renderedAt={Date.now()} />
      </main>
    </>
  );
}
