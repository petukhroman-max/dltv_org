"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createWorkspaceLinkAction,
  revokeWorkspaceLinkAction,
} from "@/app/admin/(protected)/submissions/[id]/workspace-link-actions";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { Locale } from "@/i18n/config";
import { formatAdminDateTime } from "@/lib/admin/presentation";
import {
  initialWorkspaceLinkActionState,
  type WorkspaceTokenStatus,
} from "@/lib/organizer-workspace/workspace-token.types";

function Submit({
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

export function AdminWorkspaceLinkPanel({
  submissionId,
  tokenStatus,
  canManage,
  locale = "en",
}: {
  submissionId: string;
  tokenStatus: WorkspaceTokenStatus | null;
  canManage: boolean;
  locale?: Locale;
}) {
  const t = (en: string, ru: string) => (locale === "ru" ? ru : en);
  const [createState, createAction] = useActionState(
    createWorkspaceLinkAction,
    initialWorkspaceLinkActionState,
  );
  const [revokeState, revokeAction] = useActionState(
    revokeWorkspaceLinkAction,
    initialWorkspaceLinkActionState,
  );
  const [copied, setCopied] = useState(false);
  const status = tokenStatus
    ? `${tokenStatus.state} · ${t("expires", "истекает")} ${formatAdminDateTime(tokenStatus.expiresAt, locale)} · ${t("last used", "использована")} ${formatAdminDateTime(tokenStatus.lastUsedAt, locale)}`
    : t("No workspace link", "Ссылка на кабинет не создана");
  async function copy() {
    if (!createState.workspaceUrl) return;
    await navigator.clipboard.writeText(createState.workspaceUrl);
    setCopied(true);
  }
  const createForm = (
    <form action={createAction}>
      <input type="hidden" name="submission_id" value={submissionId} />
      <label>
        {t("Label", "Название")}
        <input
          name="label"
          maxLength={100}
          placeholder={t("Primary organizer", "Основной организатор")}
        />
      </label>
      <label>
        {t("Expiration", "Срок действия")}
        <select name="expiration_days" defaultValue="30">
          <option value="7">7 {t("days", "дней")}</option>
          <option value="30">30 {t("days", "дней")}</option>
          <option value="90">90 {t("days", "дней")}</option>
        </select>
      </label>
      <Submit pendingLabel={t("Working…", "Выполняется…")}>
        {t("Create workspace link", "Создать ссылку")}
      </Submit>
    </form>
  );
  return (
    <section className="adminPanel" aria-labelledby="workspace-link-heading">
      <h2 id="workspace-link-heading">
        {t("Organizer workspace", "Кабинет организатора")}
      </h2>
      <p className="supportingText">
        {t("Current status", "Текущий статус")}: <strong>{status}</strong>
      </p>
      <p className="adminWarning">
        {t(
          "Send this secure link to the tournament organizer manually.",
          "Передайте безопасную ссылку организатору вручную.",
        )}
      </p>
      <p className="supportingText">
        {t(
          "Copy this link now. The secret value is not stored and cannot be shown again.",
          "Скопируйте ссылку сейчас. Секрет не хранится и не может быть показан повторно.",
        )}
      </p>
      {canManage ? (
        <div className="workspaceLinkControls">
          {tokenStatus?.state === "active" ? (
            <ConfirmationDialog
              trigger={t("Generate new workspace link", "Создать новую ссылку")}
              title={t(
                "Replace the current workspace link?",
                "Заменить текущую ссылку?",
              )}
              description={t(
                "The existing link will stop working when the new link is created.",
                "После создания новой ссылки текущая перестанет работать.",
              )}
              cancelLabel={t("Cancel", "Отмена")}
            >
              {createForm}
            </ConfirmationDialog>
          ) : (
            createForm
          )}
          {tokenStatus?.state === "active" ? (
            <ConfirmationDialog
              trigger={t("Revoke workspace link", "Отозвать ссылку")}
              title={t(
                "Revoke organizer access?",
                "Отозвать доступ организатора?",
              )}
              description={t(
                "The current workspace link will stop working immediately.",
                "Текущая ссылка перестанет работать немедленно.",
              )}
              cancelLabel={t("Cancel", "Отмена")}
            >
              <form action={revokeAction}>
                <input
                  type="hidden"
                  name="submission_id"
                  value={submissionId}
                />
                <Submit pendingLabel={t("Revoking…", "Отзыв…")}>
                  {t("Revoke link", "Отозвать ссылку")}
                </Submit>
              </form>
            </ConfirmationDialog>
          ) : null}
        </div>
      ) : (
        <p className="formError">
          {t(
            "Workspace editing is unavailable for this submission status.",
            "Кабинет недоступен для текущего статуса заявки.",
          )}
        </p>
      )}
      {createState.message ? (
        <p
          className={
            createState.status === "success" ? "adminNotice" : "formError"
          }
        >
          {locale === "ru"
            ? t("Action completed.", "Действие выполнено.")
            : createState.message}
        </p>
      ) : null}
      {createState.workspaceUrl ? (
        <div className="editLinkResult">
          <code>{createState.workspaceUrl}</code>
          <button type="button" className="primaryButton" onClick={copy}>
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
        >
          {locale === "ru"
            ? t("Action completed.", "Действие выполнено.")
            : revokeState.message}
        </p>
      ) : null}
    </section>
  );
}
