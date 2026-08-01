import { unstable_noStore as noStore } from "next/cache";

import { OrganizerEditForm } from "@/components/forms/organizer-edit-form";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { getEditableSubmissionByToken } from "@/lib/organizer-edit/organizer-edit.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  noStore();
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const { token } = await params;
  const submission = await getEditableSubmissionByToken(token);

  if (!submission) {
    return (
      <main className="shell">
        <section className="successCard">
          <LocaleSwitcher locale={locale} label={dictionary.a11y.language} />
          <p className="eyebrow">
            {locale === "ru"
              ? "Редактирование организатором"
              : "Organizer edit"}
          </p>
          <h1>
            {locale === "ru"
              ? "Ссылка недействительна или больше недоступна."
              : "This edit link is invalid or no longer available."}
          </h1>
          <p className="description">
            {locale === "ru"
              ? "Запросите новую ссылку у команды модерации DLTV."
              : "Ask the DLTV moderation team for a new link."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="formShell">
      <LocaleSwitcher locale={locale} label={dictionary.a11y.language} />
      <header className="pageHeader">
        <p className="eyebrow">
          {locale === "ru" ? "Редактирование организатором" : "Organizer edit"}
        </p>
        <h1>
          {locale === "ru" ? "Обновите турнир" : "Update your tournament"}
        </h1>
        <p className="description">
          {locale === "ru"
            ? "Внесите запрошенные изменения и повторно отправьте заявку."
            : "Make the requested changes and resubmit for review."}
        </p>
      </header>
      <OrganizerEditForm
        token={token}
        submission={submission}
        locale={locale}
      />
    </main>
  );
}
