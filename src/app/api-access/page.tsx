import { ApiAccessForm } from "@/components/public/api-access-form";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getPublicApiCopy } from "@/lib/public-api/copy";

export default async function ApiAccessPage() {
  const locale = await getRequestLocale();
  const copy = getPublicApiCopy(locale).access;
  return (
    <main className="publicPage">
      <section className="contentPanel">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <ApiAccessForm locale={locale} />
      </section>
    </main>
  );
}
