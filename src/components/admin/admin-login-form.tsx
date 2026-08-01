"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestAdminMagicLinkAction } from "@/app/admin/login/actions";
import type { Locale } from "@/i18n/config";
import { getAdminCopy } from "@/lib/admin/copy";
import {
  initialAdminLoginState,
  type AdminLoginState,
} from "@/lib/admin/login";

function LoginButton({ copy }: { copy: ReturnType<typeof getAdminCopy> }) {
  const { pending } = useFormStatus();
  return (
    <button className="primaryButton" type="submit" disabled={pending}>
      <span aria-live="polite">
        {pending ? copy.login.submitting : copy.login.submit}
      </span>
    </button>
  );
}

export function AdminLoginForm({
  initialState = initialAdminLoginState,
  locale = "en",
}: {
  initialState?: AdminLoginState;
  locale?: Locale;
}) {
  const adminCopy = getAdminCopy(locale);
  const [state, action] = useActionState(
    requestAdminMagicLinkAction,
    initialState,
  );
  const errorId = state.fieldError ? "admin-email-error" : undefined;

  return (
    <form className="adminLoginForm" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <div className="field">
        <label htmlFor="admin-email">{adminCopy.login.emailLabel}</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          aria-invalid={Boolean(state.fieldError)}
          aria-describedby={errorId}
        />
        {state.fieldError ? (
          <p className="fieldError" id={errorId}>
            {adminCopy.login.invalidEmail}
          </p>
        ) : null}
      </div>
      {state.message ? (
        <p className="adminNotice" role="status">
          {adminCopy.login.genericSuccess}
        </p>
      ) : null}
      <LoginButton copy={adminCopy} />
    </form>
  );
}
