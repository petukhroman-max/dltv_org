import { notFound } from "next/navigation";
import {
  updateApiClientAction,
  updateApiKeyStatusAction,
} from "@/app/admin/(protected)/api-actions";
import { ApiKeyCreateForm } from "@/components/admin/api-key-create-form";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { apiEndpointNames } from "@/lib/public-api/constants";
import { getApiClientDetails } from "@/lib/public-api/admin.repository";
export default async function ApiClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const details = await getApiClientDetails((await params).id);
  const locale = await getRequestLocale();
  if (!details) notFound();
  const { client, keys } = details;
  const t =
    locale === "ru"
      ? {
          requests: "запросов записано",
          status: "Статус",
          attribution: "Атрибуция",
          attributionNote: "Заметка об атрибуции",
          minute: "В минуту",
          day: "В сутки",
          origins: "Разрешённые browser origins",
          save: "Сохранить настройки клиента",
          saveConfirm:
            "Применить настройки статуса, атрибуции, endpoints и rate limits?",
          keys: "Ключи",
          lastUsed: "последнее использование",
          never: "никогда",
          created: "создан",
          expires: "истекает",
          suspend: "Приостановить",
          revoke: "Отозвать",
          suspendConfirm: "Приостановить API-ключ?",
          revokeConfirm: "Безвозвратно отозвать API-ключ?",
          errors: "Последние ошибки",
          audit: "Аудит",
          nonCompliant:
            "Атрибуция отмечена как non-compliant. Доступ остаётся активным, пока администратор явно не приостановит клиента.",
        }
      : {
          requests: "requests logged",
          status: "Status",
          attribution: "Attribution",
          attributionNote: "Attribution note",
          minute: "Per minute",
          day: "Per day",
          origins: "Allowed browser origins",
          save: "Save client settings",
          saveConfirm:
            "Apply these client status, attribution, endpoint, and rate-limit settings?",
          keys: "Keys",
          lastUsed: "last used",
          never: "never",
          created: "created",
          expires: "expires",
          suspend: "Suspend",
          revoke: "Revoke",
          suspendConfirm: "Suspend this API key?",
          revokeConfirm:
            "Permanently revoke this API key? This cannot be undone.",
          errors: "Recent errors",
          audit: "Audit",
          nonCompliant:
            "Attribution is marked non-compliant. Access remains active until an administrator explicitly suspends the client.",
        };
  return (
    <main className="adminMain">
      <h1>{client.organization_name}</h1>
      <p>
        <a href={client.website_url}>{client.website_url}</a> ·{" "}
        {details.usageCount} {t.requests}
      </p>
      {client.attribution_status === "non_compliant" ? (
        <p role="alert">{t.nonCompliant}</p>
      ) : null}
      <form action={updateApiClientAction}>
        <input type="hidden" name="client_id" value={client.id} />
        <label>
          {t.status}
          <select name="status" defaultValue={client.status}>
            {client.status === "revoked" ? (
              <option>revoked</option>
            ) : (
              <>
                <option>active</option>
                <option>suspended</option>
                <option>revoked</option>
              </>
            )}
          </select>
        </label>
        <label>
          {t.attribution}
          <select
            name="attribution_status"
            defaultValue={client.attribution_status}
          >
            <option>not_reviewed</option>
            <option>compliant</option>
            <option>non_compliant</option>
            <option>grace_period</option>
          </select>
        </label>
        <label>
          {t.attributionNote}
          <textarea
            name="attribution_note"
            defaultValue={client.attribution_check_note ?? ""}
          />
        </label>
        <label>
          {t.minute}
          <input
            name="rate_limit_per_minute"
            type="number"
            min="1"
            defaultValue={client.default_rate_limit_per_minute}
          />
        </label>
        <label>
          {t.day}
          <input
            name="rate_limit_per_day"
            type="number"
            min="1"
            defaultValue={client.default_rate_limit_per_day}
          />
        </label>
        <fieldset>
          {apiEndpointNames.map((endpoint) => (
            <label key={endpoint}>
              <input
                type="checkbox"
                name="allowed_endpoints"
                value={endpoint}
                defaultChecked={
                  client.allowed_endpoints?.includes(endpoint) ?? true
                }
              />
              {endpoint}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{t.origins}</legend>
          {(client.allowed_origins ?? []).map((origin, index) => (
            <input
              key={`${origin}-${index}`}
              name="allowed_origins"
              type="url"
              defaultValue={origin}
            />
          ))}
          <input
            name="allowed_origins"
            type="url"
            placeholder="https://partner.example"
          />
        </fieldset>
        <ConfirmSubmitButton confirmation={t.saveConfirm}>
          {t.save}
        </ConfirmSubmitButton>
      </form>
      <h2>{t.keys}</h2>
      <ApiKeyCreateForm clientId={client.id} locale={locale} />
      <ul>
        {keys.map((key) => (
          <li key={key.id}>
            <code>{key.key_prefix}…</code> · {key.status} · {t.lastUsed}{" "}
            {key.last_used_at ?? t.never} · {t.created} {key.created_at}
            {key.expires_at ? ` · ${t.expires} ${key.expires_at}` : ""}
            {key.label ? ` · ${key.label}` : ""}
            {key.status === "active" ? (
              <>
                <ApiKeyCreateForm
                  clientId={client.id}
                  rotateOldKeyId={key.id}
                  locale={locale}
                />
                <form action={updateApiKeyStatusAction}>
                  <input type="hidden" name="client_id" value={client.id} />
                  <input type="hidden" name="key_id" value={key.id} />
                  <ConfirmSubmitButton
                    confirmation={t.suspendConfirm}
                    name="status"
                    value="suspended"
                  >
                    {t.suspend}
                  </ConfirmSubmitButton>
                  <ConfirmSubmitButton
                    confirmation={t.revokeConfirm}
                    name="status"
                    value="revoked"
                  >
                    {t.revoke}
                  </ConfirmSubmitButton>
                </form>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <h2>{t.errors}</h2>
      <ul>
        {details.recentErrors.map((error) => (
          <li key={error.request_id}>
            {error.response_status} {error.endpoint} · {error.created_at}
          </li>
        ))}
      </ul>
      <h2>{t.audit}</h2>
      <ul>
        {details.audit.map((event) => (
          <li key={`${event.created_at}-${event.event_type}`}>
            {event.event_type} · {event.created_at}
          </li>
        ))}
      </ul>
    </main>
  );
}
