import { notFound } from "next/navigation";
import {
  approveApiAccessRequestAction,
  rejectApiAccessRequestAction,
} from "@/app/admin/(protected)/api-actions";
import { apiEndpointNames } from "@/lib/public-api/constants";
import { getApiAccessRequest } from "@/lib/public-api/admin.repository";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { getRequestLocale } from "@/i18n/get-dictionary";
export default async function ApiAccessRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const request = await getApiAccessRequest((await params).id);
  const locale = await getRequestLocale();
  const t =
    locale === "ru"
      ? {
          contact: "Контакт",
          website: "Сайт",
          use: "Использование",
          volume: "Ожидаемый объём",
          missing: "Не указано",
          consent: "Условия / атрибуция",
          accepted: "приняты",
          slug: "Slug клиента",
          minute: "В минуту",
          day: "В сутки",
          endpoints: "Разрешённые endpoints",
          origin: "Разрешённый origin (необязательно)",
          note: "Внутренняя заметка",
          approve: "Одобрить и создать клиента",
          rejection: "Причина отклонения",
          reject: "Отклонить",
          rejectConfirm: "Отклонить заявку на API-доступ?",
          status: "Статус",
        }
      : {
          contact: "Contact",
          website: "Website",
          use: "Intended use",
          volume: "Expected volume",
          missing: "Not provided",
          consent: "Terms / attribution",
          accepted: "accepted",
          slug: "Client slug",
          minute: "Per minute",
          day: "Per day",
          endpoints: "Allowed endpoints",
          origin: "Allowed origin (optional)",
          note: "Internal note",
          approve: "Approve and create client",
          rejection: "Rejection note",
          reject: "Reject",
          rejectConfirm: "Reject this API access request?",
          status: "Status",
        };
  if (!request) notFound();
  return (
    <main className="adminMain">
      <h1>{request.organization_name}</h1>
      <dl>
        <dt>{t.contact}</dt>
        <dd>
          {request.contact_name} · {request.contact_email}
        </dd>
        <dt>{t.website}</dt>
        <dd>
          <a href={request.website_url}>{request.website_url}</a>
        </dd>
        <dt>{t.use}</dt>
        <dd>{request.intended_use}</dd>
        <dt>{t.volume}</dt>
        <dd>{request.expected_request_volume ?? t.missing}</dd>
        <dt>{t.consent}</dt>
        <dd>
          {request.terms_version} · {t.accepted}
        </dd>
      </dl>
      {request.status === "pending" ? (
        <>
          <form action={approveApiAccessRequestAction}>
            <input type="hidden" name="request_id" value={request.id} />
            <label>
              {t.slug}
              <input
                name="client_slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
            </label>
            <label>
              {t.minute}
              <input
                name="rate_limit_per_minute"
                type="number"
                min="1"
                defaultValue="60"
              />
            </label>
            <label>
              {t.day}
              <input
                name="rate_limit_per_day"
                type="number"
                min="1"
                defaultValue="10000"
              />
            </label>
            <fieldset>
              <legend>{t.endpoints}</legend>
              {apiEndpointNames.map((endpoint) => (
                <label key={endpoint}>
                  <input
                    type="checkbox"
                    name="allowed_endpoints"
                    value={endpoint}
                    defaultChecked={
                      request.requested_endpoints?.includes(endpoint) ?? true
                    }
                  />
                  {endpoint}
                </label>
              ))}
            </fieldset>
            <label>
              {t.origin}
              <input name="allowed_origins" type="url" />
            </label>
            <label>
              {t.note}
              <textarea name="admin_note" maxLength={4000} />
            </label>
            <button className="primaryButton" type="submit">
              {t.approve}
            </button>
          </form>
          <form action={rejectApiAccessRequestAction}>
            <input type="hidden" name="request_id" value={request.id} />
            <label>
              {t.rejection}
              <textarea name="admin_note" required maxLength={4000} />
            </label>
            <ConfirmSubmitButton
              className="dangerButton"
              confirmation={t.rejectConfirm}
            >
              {t.reject}
            </ConfirmSubmitButton>
          </form>
        </>
      ) : (
        <p>
          {t.status}: {request.status}
        </p>
      )}
    </main>
  );
}
