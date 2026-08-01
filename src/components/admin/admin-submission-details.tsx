import { StatusBadge } from "@/components/admin/status-badge";
import type { Locale } from "@/i18n/config";
import { getAdminCopy } from "@/lib/admin/copy";
import {
  formatAdminDate,
  formatAdminDateTime,
  getSafeExternalUrl,
  sanitizeEventMetadata,
} from "@/lib/admin/presentation";
import type { TableRow } from "@/lib/supabase/database.types";

export type AdminSubmissionDetailsData = {
  submission: TableRow<"tournament_submissions">;
  organizer: TableRow<"organizers">;
  events: TableRow<"submission_events">[];
};

const moderationEventLabelsEn: Record<string, string> = {
  submission_approved: "Approved by admin",
  submission_rejected: "Rejected by admin",
  changes_requested: "Changes requested",
  submission_published: "Published",
  edit_link_created: "Organizer edit link created",
  edit_link_revoked: "Organizer edit link revoked",
  submission_resubmitted: "Resubmitted by organizer",
  workspace_link_created: "Workspace link created",
  workspace_link_revoked: "Workspace link revoked",
  workspace_link_rotated: "Workspace link rotated",
  stage_created: "Stage created",
  stage_updated: "Stage updated",
  stage_deleted: "Stage deleted",
  team_created: "Team created",
  team_updated: "Team updated",
  team_deleted: "Team deleted",
  player_created: "Player created",
  player_profile_updated: "Player profile updated",
  roster_member_added: "Added to roster",
  roster_member_updated: "Roster membership updated",
  roster_member_removed: "Removed from roster",
  roster_member_restored: "Restored to roster",
  roster_captain_changed: "Team captain changed",
};
const moderationEventLabelsRu: Record<string, string> = {
  submission_approved: "Заявка одобрена",
  submission_rejected: "Заявка отклонена",
  changes_requested: "Запрошены изменения",
  submission_published: "Турнир опубликован",
  edit_link_created: "Создана ссылка для редактирования",
  edit_link_revoked: "Ссылка для редактирования отозвана",
  submission_resubmitted: "Заявка отправлена повторно",
  workspace_link_created: "Создана ссылка на кабинет",
  workspace_link_revoked: "Ссылка на кабинет отозвана",
  workspace_link_rotated: "Ссылка на кабинет обновлена",
  stage_created: "Этап создан",
  stage_updated: "Этап обновлён",
  stage_deleted: "Этап удалён",
  team_created: "Команда создана",
  team_updated: "Команда обновлена",
  team_deleted: "Команда удалена",
  player_created: "Игрок создан",
  player_profile_updated: "Профиль игрока обновлён",
  roster_member_added: "Участник добавлен в состав",
  roster_member_updated: "Участие в составе обновлено",
  roster_member_removed: "Участник убран из состава",
  roster_member_restored: "Участник восстановлен в составе",
  roster_captain_changed: "Капитан команды изменён",
};

function label(locale: Locale, en: string, ru: string) {
  return locale === "ru" ? ru : en;
}

function Value({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="adminDefinition">
      <dt>{label}</dt>
      <dd>{children ?? "—"}</dd>
    </div>
  );
}

function ExternalLink({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const safeUrl = getSafeExternalUrl(value);
  return (
    <Value label={label}>
      {safeUrl ? (
        <a href={safeUrl} target="_blank" rel="noopener noreferrer">
          {safeUrl}
        </a>
      ) : (
        "—"
      )}
    </Value>
  );
}

export function AdminSubmissionDetails({
  details,
  locale = "en",
  hideHistory = false,
  historyOnly = false,
}: {
  details: AdminSubmissionDetailsData;
  locale?: Locale;
  hideHistory?: boolean;
  historyOnly?: boolean;
}) {
  const adminCopy = getAdminCopy(locale);
  const moderationEventLabels =
    locale === "ru" ? moderationEventLabelsRu : moderationEventLabelsEn;
  const { submission, organizer, events } = details;

  return (
    <div className="adminDetails">
      {!historyOnly ? (
        <>
          <section className="adminPanel" aria-labelledby="tournament-heading">
            <div className="adminPanelHeading">
              <h2 id="tournament-heading">{adminCopy.details.tournament}</h2>
              <StatusBadge status={submission.status} locale={locale} />
            </div>
            <dl className="adminDefinitionGrid">
              <Value label={label(locale, "Name", "Название")}>
                {submission.tournament_name}
              </Value>
              <Value label={label(locale, "Region", "Регион")}>
                {submission.region}
              </Value>
              <Value label={label(locale, "Language", "Язык")}>
                {submission.language}
              </Value>
              <Value label={label(locale, "Description", "Описание")}>
                {submission.description}
              </Value>
              <Value label={label(locale, "Start date", "Дата начала")}>
                {formatAdminDate(submission.start_date, locale)}
              </Value>
              <Value label={label(locale, "End date", "Дата окончания")}>
                {formatAdminDate(submission.end_date, locale)}
              </Value>
              <Value label={label(locale, "Timezone", "Часовой пояс")}>
                {submission.timezone}
              </Value>
              <Value label={label(locale, "Format", "Формат")}>
                {submission.format}
              </Value>
              <Value label={label(locale, "Prize pool", "Призовой фонд")}>
                {submission.prize_pool_text}
              </Value>
              <Value label={label(locale, "Location", "Место проведения")}>
                {submission.is_online
                  ? adminCopy.details.online
                  : adminCopy.details.offline}
              </Value>
              <Value label={label(locale, "Maximum teams", "Максимум команд")}>
                {submission.max_teams}
              </Value>
              <Value
                label={label(
                  locale,
                  "Registration deadline",
                  "Окончание регистрации",
                )}
              >
                {formatAdminDateTime(submission.registration_deadline, locale)}
              </Value>
              <Value
                label={label(
                  locale,
                  "Organizer notes",
                  "Примечания организатора",
                )}
              >
                {submission.organizer_notes}
              </Value>
              <Value
                label={label(locale, "Reviewer notes", "Примечания модератора")}
              >
                {submission.reviewer_notes}
              </Value>
              <Value label={label(locale, "Submitted", "Отправлена")}>
                {formatAdminDateTime(submission.submitted_at, locale)}
              </Value>
              <Value label={label(locale, "Reviewed", "Проверена")}>
                {formatAdminDateTime(submission.reviewed_at, locale)}
              </Value>
              <Value label={label(locale, "Published", "Опубликована")}>
                {formatAdminDateTime(submission.published_at, locale)}
              </Value>
              <Value label={label(locale, "Created", "Создана")}>
                {formatAdminDateTime(submission.created_at, locale)}
              </Value>
              <Value label={label(locale, "Last updated", "Обновлена")}>
                {formatAdminDateTime(submission.updated_at, locale)}
              </Value>
            </dl>
          </section>

          <section className="adminPanel" aria-labelledby="organizer-heading">
            <h2 id="organizer-heading">{adminCopy.details.organizer}</h2>
            <dl className="adminDefinitionGrid">
              <Value label={label(locale, "Organization", "Организация")}>
                {organizer.organization_name}
              </Value>
              <Value label={label(locale, "Contact name", "Контактное лицо")}>
                {organizer.contact_name}
              </Value>
              <Value label={label(locale, "Contact email", "Email для связи")}>
                <a href={`mailto:${organizer.contact_email}`}>
                  {organizer.contact_email}
                </a>
              </Value>
              <Value label={label(locale, "Discord username", "Имя в Discord")}>
                {organizer.discord_username}
              </Value>
              <ExternalLink
                label={label(locale, "Website", "Сайт")}
                value={organizer.website_url}
              />
            </dl>
          </section>

          <section className="adminPanel" aria-labelledby="links-heading">
            <h2 id="links-heading">{adminCopy.details.links}</h2>
            <dl className="adminDefinitionGrid">
              <ExternalLink
                label={label(locale, "Registration", "Регистрация")}
                value={submission.registration_url}
              />
              <ExternalLink
                label={label(locale, "Bracket", "Сетка")}
                value={submission.bracket_url}
              />
              <ExternalLink label="Discord" value={submission.discord_url} />
              <ExternalLink
                label={label(locale, "Stream", "Трансляция")}
                value={submission.stream_url}
              />
              <ExternalLink
                label={label(locale, "Rules", "Правила")}
                value={submission.rules_url}
              />
            </dl>
          </section>
        </>
      ) : null}

      {!hideHistory ? (
        <section className="adminPanel" aria-labelledby="audit-heading">
          <h2 id="audit-heading">{adminCopy.details.audit}</h2>
          {events.length === 0 ? (
            <p className="adminEmpty">{adminCopy.details.noEvents}</p>
          ) : (
            <ol className="adminTimeline">
              {events.map((event) => {
                const metadata = sanitizeEventMetadata(event.metadata);
                const objectMetadata =
                  metadata &&
                  !Array.isArray(metadata) &&
                  typeof metadata === "object"
                    ? metadata
                    : null;
                const moderationLabel = moderationEventLabels[event.event_type];
                const reviewerNote =
                  objectMetadata &&
                  typeof objectMetadata.reviewer_note === "string"
                    ? objectMetadata.reviewer_note
                    : null;
                const entityName =
                  objectMetadata &&
                  typeof objectMetadata.entity_name === "string"
                    ? objectMetadata.entity_name
                    : null;
                return (
                  <li key={event.id}>
                    <div className="adminEventHeading">
                      <strong>{moderationLabel ?? event.event_type}</strong>
                      <time dateTime={event.created_at}>
                        {formatAdminDateTime(event.created_at, locale)}
                      </time>
                    </div>
                    <p>
                      {event.from_status ?? "none"} →{" "}
                      {event.to_status ?? "none"} ·{" "}
                      {event.actor_type === "admin"
                        ? label(locale, "Admin", "Администратор")
                        : event.actor_type}
                    </p>
                    {moderationLabel && reviewerNote ? (
                      <dl className="adminEventMetadata">
                        <Value
                          label={label(
                            locale,
                            "Reviewer note",
                            "Примечание модератора",
                          )}
                        >
                          {reviewerNote}
                        </Value>
                      </dl>
                    ) : null}
                    {moderationLabel && entityName ? (
                      <p className="supportingText">{entityName}</p>
                    ) : null}
                    {objectMetadata &&
                    "consent_to_publish" in objectMetadata ? (
                      <dl className="adminEventMetadata">
                        <Value label={adminCopy.details.consentToPublish}>
                          {objectMetadata.consent_to_publish === true
                            ? label(locale, "Yes", "Да")
                            : label(locale, "No", "Нет")}
                        </Value>
                        {"consent_version" in objectMetadata ? (
                          <Value label={adminCopy.details.consentVersion}>
                            {String(objectMetadata.consent_version)}
                          </Value>
                        ) : null}
                      </dl>
                    ) : null}
                    {!moderationLabel &&
                    metadata &&
                    typeof metadata === "object" &&
                    Object.keys(metadata).length > 0 ? (
                      <div>
                        <p className="adminMetadataLabel">
                          {adminCopy.details.unknownMetadata}
                        </p>
                        <pre className="adminMetadata">
                          <code>{JSON.stringify(metadata, null, 2)}</code>
                        </pre>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}
