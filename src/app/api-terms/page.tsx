import { getRequestLocale } from "@/i18n/get-dictionary";
import { getPublicApiCopy } from "@/lib/public-api/copy";

export default async function ApiTermsPage() {
  const locale = await getRequestLocale();
  const copy = getPublicApiCopy(locale).terms;
  return (
    <main className="publicPage">
      <article className="contentPanel">
        <h1>{copy.title}</h1>
        <p>
          <strong>{copy.version}</strong>
        </p>
        <p>{copy.intro}</p>
        <ul>
          {copy.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{copy.contact}</p>
      </article>
    </main>
  );
}
