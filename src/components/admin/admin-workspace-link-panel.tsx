"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createWorkspaceLinkAction,
  revokeWorkspaceLinkAction,
} from "@/app/admin/(protected)/submissions/[id]/workspace-link-actions";
import { formatAdminDateTime } from "@/lib/admin/presentation";
import {
  initialWorkspaceLinkActionState,
  type WorkspaceTokenStatus,
} from "@/lib/organizer-workspace/workspace-token.types";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="secondaryButton" type="submit" disabled={pending}>
      {pending ? "Working…" : children}
    </button>
  );
}

export function AdminWorkspaceLinkPanel({
  submissionId,
  tokenStatus,
  canManage,
}: {
  submissionId: string;
  tokenStatus: WorkspaceTokenStatus | null;
  canManage: boolean;
}) {
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
    ? `${tokenStatus.state} · expires ${formatAdminDateTime(tokenStatus.expiresAt)} · last used ${formatAdminDateTime(tokenStatus.lastUsedAt)}`
    : "No workspace link";
  async function copy() {
    if (!createState.workspaceUrl) return;
    await navigator.clipboard.writeText(createState.workspaceUrl);
    setCopied(true);
  }
  return (
    <section className="adminPanel" aria-labelledby="workspace-link-heading">
      <h2 id="workspace-link-heading">Organizer workspace</h2>
      <p className="supportingText">
        Current status: <strong>{status}</strong>
      </p>
      <p className="adminWarning">
        Send this secure link to the tournament organizer manually.
      </p>
      <p className="supportingText">
        Copy this link now. The secret value is not stored and cannot be shown
        again.
      </p>
      {canManage ? (
        <div className="workspaceLinkControls">
          <form action={createAction}>
            <input type="hidden" name="submission_id" value={submissionId} />
            <label>
              Label
              <input
                name="label"
                maxLength={100}
                placeholder="Primary organizer"
              />
            </label>
            <label>
              Expiration
              <select name="expiration_days" defaultValue="30">
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </label>
            <Submit>
              {tokenStatus?.state === "active"
                ? "Generate new workspace link"
                : "Create workspace link"}
            </Submit>
          </form>
          <form action={revokeAction}>
            <input type="hidden" name="submission_id" value={submissionId} />
            <Submit>Revoke workspace link</Submit>
          </form>
        </div>
      ) : (
        <p className="formError">
          Workspace editing is unavailable for this submission status.
        </p>
      )}
      {createState.message ? (
        <p
          className={
            createState.status === "success" ? "adminNotice" : "formError"
          }
        >
          {createState.message}
        </p>
      ) : null}
      {createState.workspaceUrl ? (
        <div className="editLinkResult">
          <code>{createState.workspaceUrl}</code>
          <button type="button" className="primaryButton" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}
      {revokeState.message ? (
        <p
          className={
            revokeState.status === "success" ? "adminNotice" : "formError"
          }
        >
          {revokeState.message}
        </p>
      ) : null}
    </section>
  );
}
