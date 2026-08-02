"use client";

import { useActionState, useState } from "react";
import {
  createApiKeyAction,
  rotateApiKeyAction,
} from "@/app/admin/(protected)/api-actions";
import { initialApiKeyActionState } from "@/lib/public-api/admin-action.state";
import { getApiAdminCopy } from "@/lib/public-api/admin-copy";
import type { Locale } from "@/i18n/config";

export function ApiKeyCreateForm({
  clientId,
  rotateOldKeyId,
  locale,
}: {
  clientId: string;
  rotateOldKeyId?: string;
  locale: Locale;
}) {
  const copy = getApiAdminCopy(locale);
  const [state, action, pending] = useActionState(
    rotateOldKeyId ? rotateApiKeyAction : createApiKeyAction,
    initialApiKeyActionState,
  );
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  if (state.status === "success" && state.rawKey && !dismissed)
    return (
      <section className="contentPanel">
        <h2>{copy.copyNow}</h2>
        <p>{copy.shownOnce}</p>
        <code>{state.rawKey}</code>
        <p>
          Prefix: <code>{state.keyPrefix}</code> · {copy.created}:{" "}
          {state.createdAt}
        </p>
        <p>{copy.storage}</p>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(state.rawKey!);
            setCopied(true);
          }}
        >
          {copy.copyKey}
        </button>
        <span role="status" aria-live="polite">
          {copied ? copy.copied : ""}
        </span>
        <button type="button" onClick={() => setDismissed(true)}>
          {copy.saved}
        </button>
      </section>
    );
  return (
    <form action={action}>
      <input type="hidden" name="client_id" value={clientId} />
      {rotateOldKeyId ? (
        <input type="hidden" name="old_key_id" value={rotateOldKeyId} />
      ) : null}
      <label>
        {copy.label}
        <input name="label" maxLength={120} />
      </label>
      <label>
        {copy.expires}
        <input name="expires_at" type="datetime-local" />
      </label>
      {state.status === "error" ? <p role="alert">{state.message}</p> : null}
      <button
        className="primaryButton"
        disabled={pending}
        type="submit"
        onClick={(event) => {
          if (rotateOldKeyId && !window.confirm(copy.rotateConfirm))
            event.preventDefault();
        }}
      >
        {pending
          ? copy.creating
          : rotateOldKeyId
            ? copy.rotateKey
            : copy.createKey}
      </button>
    </form>
  );
}
