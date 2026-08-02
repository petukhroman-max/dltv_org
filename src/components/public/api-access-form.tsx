"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { submitApiAccessRequestAction } from "@/app/api-access/actions";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/config";
import { apiEndpointNames } from "@/lib/public-api/constants";
import { getPublicApiCopy } from "@/lib/public-api/copy";
import { initialApiAccessRequestState } from "@/lib/public-api/access-request.state";

export function ApiAccessForm({ locale }: { locale: Locale }) {
  const copy = getPublicApiCopy(locale).access;
  const renderedAt = useRef(Date.now());
  const [state, action, pending] = useActionState(
    submitApiAccessRequestAction,
    initialApiAccessRequestState,
  );
  const [attribution, setAttribution] = useState(false);
  const [terms, setTerms] = useState(false);
  if (state.status === "success")
    return (
      <div className="successPanel" role="status">
        {copy.success}
      </div>
    );
  return (
    <form action={action} className="submissionForm">
      <input type="hidden" name="rendered_at" value={renderedAt.current} />
      <div className="honeypotField" aria-hidden="true">
        <label>
          Company fax
          <input name="company_fax" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label>
        {copy.organization}
        <input
          name="organization_name"
          required
          minLength={2}
          maxLength={160}
        />
      </label>
      <label>
        {copy.contact}
        <input name="contact_name" required minLength={2} maxLength={120} />
      </label>
      <label>
        {copy.email}
        <input name="contact_email" type="email" required maxLength={254} />
      </label>
      <label>
        {copy.website}
        <input name="website_url" type="url" required placeholder="https://" />
      </label>
      <label>
        {copy.use}
        <textarea
          name="intended_use"
          required
          minLength={20}
          maxLength={4000}
          rows={5}
        />
      </label>
      <label>
        {copy.volume}
        <input name="expected_request_volume" maxLength={500} />
      </label>
      <fieldset>
        <legend>{copy.endpoints}</legend>
        {apiEndpointNames.map((endpoint) => (
          <label key={endpoint}>
            <input
              type="checkbox"
              name="requested_endpoints"
              value={endpoint}
              defaultChecked
            />{" "}
            {endpoint}
          </label>
        ))}
      </fieldset>
      <label>
        <input
          type="checkbox"
          name="attribution_accepted"
          required
          checked={attribution}
          onChange={(event) => setAttribution(event.target.checked)}
        />{" "}
        {copy.attribution}
      </label>
      <label>
        <input
          type="checkbox"
          name="terms_accepted"
          required
          checked={terms}
          onChange={(event) => setTerms(event.target.checked)}
        />{" "}
        {copy.terms}{" "}
        <Link href={localizePath(locale, "/api-terms")}>API Terms</Link>
      </label>
      <p className="mutedText">{copy.privacy}</p>
      {state.status === "error" ? (
        <p className="formError" role="alert">
          {copy.error}
        </p>
      ) : null}
      <button
        className="primaryButton"
        type="submit"
        disabled={pending || !attribution || !terms}
      >
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
