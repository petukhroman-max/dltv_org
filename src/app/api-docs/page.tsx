import Link from "next/link";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";

export default async function ApiDocsPage() {
  const locale = await getRequestLocale();
  const ru = locale === "ru";
  const text = ru
    ? {
        title: "Документация DLTV Public API v1",
        intro:
          "Аутентифицированный read-only доступ к опубликованным турнирным данным DLTV.",
        access: "Получение доступа",
        accessBody:
          "Отправьте заявку, примите отдельные требования Terms и атрибуции. После ручного approval администратор создаст API client и одноразово покажет ключ.",
        auth: "Аутентификация",
        attribution: "Атрибуция",
        attributionBody:
          "Показывайте «Источник данных: DLTV» рядом с данными или на явно связанной странице и добавляйте ссылку на deadlock.one, если формат поддерживает ссылки.",
        limits: "Rate limits и пагинация",
        limitsBody:
          "Лимиты действуют одновременно на client и key за минуту и сутки. Для продолжения списка передавайте opaque next_cursor без изменений.",
        errors: "Ошибки",
        errorsBody:
          "Ошибки имеют стабильный английский code/message и request_id. Ответ 429 содержит Retry-After.",
      }
    : {
        title: "DLTV Public API v1 documentation",
        intro:
          "Authenticated, read-only access to published DLTV tournament data.",
        access: "Getting access",
        accessBody:
          "Submit an application and accept the separate Terms and attribution requirements. After manual approval, an administrator creates an API client and displays its key once.",
        auth: "Authentication",
        attribution: "Attribution",
        attributionBody:
          "Show “Data provided by DLTV” near the data or on a clearly linked page and link to deadlock.one where the format supports links.",
        limits: "Rate limits and pagination",
        limitsBody:
          "Minute and daily limits apply to both the client and key. Pass the opaque next_cursor back unchanged to continue a list.",
        errors: "Errors",
        errorsBody:
          "Errors have stable English code/message fields and a request_id. A 429 response includes Retry-After.",
      };
  return (
    <>
      <PublicHeader locale={locale} />
      <main className="publicPage">
        <article className="contentPanel apiDocs">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
        <h2>{text.access}</h2>
        <p>{text.accessBody}</p>
        <p>
          <Link href={localizePath(locale, "/api-access")}>
            API access request
          </Link>{" "}
          · <Link href={localizePath(locale, "/api-terms")}>API Terms</Link>
        </p>
        <h2>{text.auth}</h2>
        <pre>
          <code>{`curl \\\n  -H "Authorization: Bearer $DLTV_API_KEY" \\\n  "https://deadlock.one/api/v1/tournaments"`}</code>
        </pre>
        <p>
          Base URL: <code>https://deadlock.one/api/v1</code>. OpenAPI:{" "}
          <a href="/openapi-v1.json">/openapi-v1.json</a>.
        </p>
        <h2>{text.attribution}</h2>
        <p>{text.attributionBody}</p>
        <h2>{text.limits}</h2>
        <p>{text.limitsBody}</p>
        <pre>
          <code>{`{"data":[],"pagination":{"next_cursor":null,"has_more":false,"limit":50},"meta":{"api_version":"v1","provider":"DLTV","attribution_required":true}}`}</code>
        </pre>
        <h2>{text.errors}</h2>
        <p>{text.errorsBody}</p>
        <pre>
          <code>{`{"error":{"code":"INVALID_API_KEY","message":"The API key is invalid or inactive.","request_id":"..."}}`}</code>
        </pre>
        <h2>Endpoints</h2>
        <ul>
          {[
            "GET /api/v1/tournaments",
            "GET /api/v1/tournaments/{slug}",
            "GET /api/v1/tournaments/{slug}/stages",
            "GET /api/v1/tournaments/{slug}/teams",
            "GET /api/v1/tournaments/{slug}/matches",
            "GET /api/v1/tournaments/{slug}/bracket",
            "GET /api/v1/tournaments/{slug}/standings",
          ].map((endpoint) => (
            <li key={endpoint}>
              <code>{endpoint}</code>
            </li>
          ))}
        </ul>
        <p>
          {ru
            ? "Для отзыва доступа или изменения интеграции свяжитесь с DLTV."
            : "Contact DLTV to revoke access or report a material integration change."}
        </p>
        </article>
      </main>
      <PublicFooter locale={locale} />
    </>
  );
}
