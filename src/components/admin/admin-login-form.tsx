"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestAdminMagicLinkAction } from "@/app/admin/login/actions";
import { adminCopy } from "@/lib/admin/copy";
import {
  initialAdminLoginState,
  type AdminLoginState,
} from "@/lib/admin/login";

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <button className="primaryButton" type="submit" disabled={pending}>
      <span aria-live="polite">
        {pending ? adminCopy.login.submitting : adminCopy.login.submit}
      </span>
    </button>
  );
}

export function AdminLoginForm({
  initialState = initialAdminLoginState,
}: {
  initialState?: AdminLoginState;
}) {
  const [state, action] = useActionState(
    requestAdminMagicLinkAction,
    initialState,
  );
  const errorId = state.fieldError ? "admin-email-error" : undefined;

  return (
    <form className="adminLoginForm" action={action}>
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
            {state.fieldError}
          </p>
        ) : null}
      </div>
      {state.message ? (
        <p className="adminNotice" role="status">
          {state.message}
        </p>
      ) : null}
      <LoginButton />
    </form>
  );
}
