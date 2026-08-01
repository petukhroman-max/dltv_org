import Link from "next/link";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";

export default async function EditSubmissionSuccessPage() {
  const locale = await getRequestLocale();
  const t = (en: string, ru: string) => (locale === "ru" ? ru : en);
  return (
    <main className="shell">
      <section className="successCard">
        <p className="eyebrow">
          {t("Changes submitted", "Изменения отправлены")}
        </p>
        <h1>
          {t(
            "Your tournament is back in review.",
            "Турнир снова отправлен на проверку.",
          )}
        </h1>
        <div className="statusRow">
          <span>{t("Status", "Статус")}</span>
          <strong>{t("Submitted", "Отправлена")}</strong>
        </div>
        <p className="description">
          {t(
            "The DLTV team will review the updated tournament information.",
            "Команда DLTV проверит обновлённые сведения о турнире.",
          )}
        </p>
        <Link className="textLink" href={localizePath(locale, "/")}>
          {t("Return to home", "Вернуться на главную")}
        </Link>
      </section>
    </main>
  );
}
