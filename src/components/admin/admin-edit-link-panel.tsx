"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createSubmissionEditLinkAction,
  revokeSubmissionEditLinksAction,
} from "@/app/admin/(protected)/submissions/[id]/actions";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { Locale } from "@/i18n/config";
import { formatAdminDateTime } from "@/lib/admin/presentation";
import {
  initialEditLinkActionState,
  type EditTokenStatus,
} from "@/lib/organizer-edit/organizer-edit.types";

function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="secondaryButton" type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function AdminEditLinkPanel({
  submissionId,
  tokenStatus,
  locale = "en",
}: {
  submissionId: string;
  tokenStatus: EditTokenStatus | null;
  locale?: Locale;
}) {
  const t = (en: string, ru: string) => (locale === "ru" ? ru : en);
  const [createState, createAction] = useActionState(
    createSubmissionEditLinkAction,
    initialEditLinkActionState,
  );
  const [revokeState, revokeAction] = useActionState(
    revokeSubmissionEditLinksAction,
    initialEditLinkActionState,
  );
  const [copied, setCopied] = useState(false);

  const statusLabel = !tokenStatus
    ? t("No active edit link", "Активной ссылки нет")
    : tokenStatus.state === "active"
      ? `${t("Active edit link expires at", "Активная ссылка истекает")} ${formatAdminDateTime(tokenStatus.expiresAt, locale)}`
      : tokenStatus.state === "used"
        ? t("Edit link used", "Ссылка использована")
        : tokenStatus.state === "revoked"
          ? t("Edit link revoked", "Ссылка отозвана")
          : t("Edit link expired", "Срок действия ссылки истёк");

  async function copyLink() {
    if (!createState.editUrl) return;
    await navigator.clipboard.writeText(createState.editUrl);
    setCopied(true);
  }

  return (
    <section className="adminPanel" aria-labelledby="edit-link-heading">
      <h2 id="edit-link-heading">
        {t("Organizer edit link", "Ссылка для редактирования")}
      </h2>
      <p className="supportingText">
        {t("Current link status", "Текущий статус ссылки")}:{" "}
        <strong>{statusLabel}</strong>
      </p>
      <p className="adminWarning">
        {t(
          "Send this secure link to the organizer manually. Email notifications are not enabled.",
          "Передайте безопасную ссылку организатору вручную. Уведомления по электронной почте не настроены.",
        )}
      </p>
      {tokenStatus?.state === "active" && !createState.editUrl ? (
        <p className="supportingText">
          {t(
            "An active link exists, but its secret value is not stored. Generate a new link to copy it again.",
            "Активная ссылка существует, но её секрет не хранится. Создайте новую ссылку, чтобы скопировать её.",
          )}
        </p>
      ) : null}
      <p className="supportingText">
        {t(
          "The plaintext link is shown only after creation and is unavailable after refresh. Creating another link revokes the previous one.",
          "Ссылка показывается только после создания и станет недоступна после обновления страницы. Новая ссылка отзывает предыдущую.",
        )}
      </p>
      <div className="formActions">
        {tokenStatus?.state === "active" ? (
          <ConfirmationDialog
            trigger={t("Create new link", "Создать новую ссылку")}
            title={t(
              "Replace the current edit link?",
              "Заменить текущую ссылку?",
            )}
            description={t(
              "The existing edit link will stop working immediately.",
              "Текущая ссылка для редактирования немедленно перестанет работать.",
            )}
            cancelLabel={t("Cancel", "Отмена")}
          >
            <form action={createAction}>
              <input type="hidden" name="submission_id" value={submissionId} />
              <SubmitButton pendingLabel={t("Working…", "Выполняется…")}>
                {t("Replace link", "Заменить ссылку")}
              </SubmitButton>
            </form>
          </ConfirmationDialog>
        ) : (
          <form action={createAction}>
            <input type="hidden" name="submission_id" value={submissionId} />
            <SubmitButton pendingLabel={t("Working…", "Выполняется…")}>
              {t("Create new link", "Создать новую ссылку")}
            </SubmitButton>
          </form>
        )}
        {tokenStatus?.state === "active" ? (
          <ConfirmationDialog
            trigger={t("Revoke edit link", "Отозвать ссылку")}
            title={t("Revoke the edit link?", "Отозвать ссылку?")}
            description={t(
              "The organizer will lose access through this link immediately.",
              "Организатор немедленно потеряет доступ по этой ссылке.",
            )}
            cancelLabel={t("Cancel", "Отмена")}
          >
            <form action={revokeAction}>
              <input type="hidden" name="submission_id" value={submissionId} />
              <SubmitButton pendingLabel={t("Revoking…", "Отзыв…")}>
                {t("Revoke link", "Отозвать ссылку")}
              </SubmitButton>
            </form>
          </ConfirmationDialog>
        ) : null}
      </div>
      {createState.message ? (
        <p
          className={
            createState.status === "success" ? "adminNotice" : "formError"
          }
          role={createState.status === "success" ? "status" : "alert"}
        >
          {locale === "ru"
            ? t("Action completed.", "Действие выполнено.")
            : createState.message}
        </p>
      ) : null}
      {createState.editUrl ? (
        <div className="editLinkResult">
          <code>{createState.editUrl}</code>
          <button className="primaryButton" type="button" onClick={copyLink}>
            {copied
              ? t("Copied", "Скопировано")
              : t("Copy link", "Копировать ссылку")}
          </button>
        </div>
      ) : null}
      {revokeState.message ? (
        <p
          className={
            revokeState.status === "success" ? "adminNotice" : "formError"
          }
          role={revokeState.status === "success" ? "status" : "alert"}
        >
          {locale === "ru"
            ? t("Action completed.", "Действие выполнено.")
            : revokeState.message}
        </p>
      ) : null}
    </section>
  );
}
