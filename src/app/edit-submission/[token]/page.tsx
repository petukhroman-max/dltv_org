import { unstable_noStore as noStore } from "next/cache";

import { OrganizerEditForm } from "@/components/forms/organizer-edit-form";
import { getEditableSubmissionByToken } from "@/lib/organizer-edit/organizer-edit.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  noStore();
  const { token } = await params;
  const submission = await getEditableSubmissionByToken(token);

  if (!submission) {
    return (
      <main className="shell">
        <section className="successCard">
          <p className="eyebrow">Organizer edit</p>
          <h1>This edit link is invalid or no longer available.</h1>
          <p className="description">
            Ask the DLTV moderation team for a new link.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="formShell">
      <header className="pageHeader">
        <p className="eyebrow">Organizer edit</p>
        <h1>Update your tournament</h1>
        <p className="description">
          Make the requested changes and resubmit for review.
        </p>
      </header>
      <OrganizerEditForm token={token} submission={submission} />
    </main>
  );
}
