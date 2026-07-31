import Link from "next/link";

export default function EditSubmissionSuccessPage() {
  return (
    <main className="shell">
      <section className="successCard">
        <p className="eyebrow">Changes submitted</p>
        <h1>Your tournament is back in review.</h1>
        <div className="statusRow">
          <span>Status</span>
          <strong>Submitted</strong>
        </div>
        <p className="description">
          The DLTV team will review the updated tournament information.
        </p>
        <Link className="textLink" href="/">
          Return to home
        </Link>
      </section>
    </main>
  );
}
