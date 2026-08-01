"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

import { submitTournamentAction } from "@/app/submit-tournament/actions";
import { localizePath, type Locale } from "@/i18n/config";
import {
  getPublicSubmissionCopy,
  popularTimezones,
} from "@/lib/submissions/public-submission.copy";
import {
  initialPublicSubmissionState,
  publicSubmissionFieldNames,
  type PublicSubmissionActionState,
  type PublicSubmissionFieldName,
} from "@/lib/submissions/public-submission.types";

type InputFieldProps = ComponentPropsWithoutRef<"input"> & {
  name: PublicSubmissionFieldName;
  label: string;
  error?: string;
  helper?: string;
};

function InputField({
  name,
  label,
  error,
  helper,
  required,
  ...props
}: InputFieldProps) {
  const helperId = helper ? `${name}-helper` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy =
    [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        {...props}
        id={name}
        name={name}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
      />
      {helper ? (
        <p className="fieldHelper" id={helperId}>
          {helper}
        </p>
      ) : null}
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function TextareaField({
  name,
  label,
  error,
  children,
}: {
  name: PublicSubmissionFieldName;
  label: string;
  error?: string;
  children?: ReactNode;
}) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="field fieldWide">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        maxLength={4_000}
        defaultValue={typeof children === "string" ? children : ""}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id?: string; error?: string }) {
  return error ? (
    <p className="fieldError" id={id}>
      {error}
    </p>
  ) : null;
}

function SubmitButton({
  submit,
  submitting,
}: {
  submit: string;
  submitting: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="primaryButton"
      type="submit"
      disabled={pending}
      aria-disabled={pending}
    >
      <span aria-live="polite">{pending ? submitting : submit}</span>
    </button>
  );
}

export function TournamentSubmissionForm({
  renderedAt,
  initialState = initialPublicSubmissionState,
  locale = "en",
}: {
  renderedAt: number;
  initialState?: PublicSubmissionActionState;
  locale?: Locale;
}) {
  const [state, formAction] = useActionState(
    submitTournamentAction,
    initialState,
  );
  const copy = getPublicSubmissionCopy(locale);
  const { fields, helpers, sections } = copy.form;
  const errors = Object.fromEntries(
    Object.keys(state.fieldErrors).map((field) => [
      field,
      copy.errors.invalid[field as PublicSubmissionFieldName],
    ]),
  ) as PublicSubmissionActionState["fieldErrors"];
  const values = state.values;

  useEffect(() => {
    const firstInvalidField = publicSubmissionFieldNames.find(
      (field) => errors[field],
    );
    if (firstInvalidField) {
      document.getElementById(firstInvalidField)?.focus();
    }
  }, [errors]);

  return (
    <form className="submissionForm" action={formAction} noValidate>
      <input type="hidden" name="rendered_at" value={renderedAt} />
      <input type="hidden" name="locale" value={locale} />
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="company_fax">Company fax</label>
        <input
          id="company_fax"
          name="company_fax"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.formError ? (
        <div className="formError" role="alert">
          {copy.errors.generic}
        </div>
      ) : null}

      <fieldset className="formSection">
        <legend>{sections.organizer.title}</legend>
        <p className="sectionDescription">{sections.organizer.description}</p>
        <div className="fieldGrid">
          <InputField
            name="organization_name"
            label={fields.organization_name}
            type="text"
            required
            maxLength={200}
            autoComplete="organization"
            defaultValue={values.organization_name}
            error={errors.organization_name}
          />
          <InputField
            name="contact_name"
            label={fields.contact_name}
            type="text"
            required
            maxLength={200}
            autoComplete="name"
            defaultValue={values.contact_name}
            error={errors.contact_name}
          />
          <InputField
            name="contact_email"
            label={fields.contact_email}
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            defaultValue={values.contact_email}
            error={errors.contact_email}
          />
          <InputField
            name="discord_username"
            label={fields.discord_username}
            type="text"
            maxLength={200}
            autoComplete="off"
            defaultValue={values.discord_username}
            error={errors.discord_username}
          />
          <InputField
            name="website_url"
            label={fields.website_url}
            type="url"
            maxLength={2_000}
            autoComplete="url"
            defaultValue={values.website_url}
            error={errors.website_url}
          />
        </div>
      </fieldset>

      <fieldset className="formSection">
        <legend>{sections.tournament.title}</legend>
        <p className="sectionDescription">{sections.tournament.description}</p>
        <div className="fieldGrid">
          <InputField
            name="tournament_name"
            label={fields.tournament_name}
            type="text"
            required
            maxLength={300}
            defaultValue={values.tournament_name}
            error={errors.tournament_name}
          />
          <TextareaField
            name="description"
            label={fields.description}
            error={errors.description}
          >
            {values.description}
          </TextareaField>
          <InputField
            name="region"
            label={fields.region}
            type="text"
            required
            maxLength={100}
            helper={helpers.region}
            defaultValue={values.region}
            error={errors.region}
          />
          <InputField
            name="language"
            label={fields.language}
            type="text"
            maxLength={100}
            defaultValue={values.language}
            error={errors.language}
          />
          <InputField
            name="start_date"
            label={fields.start_date}
            type="date"
            required
            defaultValue={values.start_date}
            error={errors.start_date}
          />
          <InputField
            name="end_date"
            label={fields.end_date}
            type="date"
            required
            defaultValue={values.end_date}
            error={errors.end_date}
          />
          <InputField
            name="timezone"
            label={fields.timezone}
            type="text"
            required
            list="popular-timezones"
            maxLength={100}
            helper={helpers.timezone}
            defaultValue={values.timezone}
            error={errors.timezone}
          />
          <datalist id="popular-timezones">
            {popularTimezones.map((timezone) => (
              <option value={timezone} key={timezone} />
            ))}
          </datalist>
          <InputField
            name="format"
            label={fields.format}
            type="text"
            maxLength={200}
            helper={helpers.format}
            defaultValue={values.format}
            error={errors.format}
          />
          <InputField
            name="prize_pool_text"
            label={fields.prize_pool_text}
            type="text"
            maxLength={200}
            helper={helpers.prize_pool_text}
            defaultValue={values.prize_pool_text}
            error={errors.prize_pool_text}
          />
          <InputField
            name="max_teams"
            label={fields.max_teams}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            defaultValue={values.max_teams}
            error={errors.max_teams}
          />
          <InputField
            name="registration_deadline"
            label={fields.registration_deadline}
            type="text"
            maxLength={64}
            helper={helpers.registration_deadline}
            defaultValue={values.registration_deadline}
            error={errors.registration_deadline}
          />
          <div className="field fieldWide">
            <label className="checkboxLabel" htmlFor="is_online">
              <input
                id="is_online"
                name="is_online"
                type="checkbox"
                defaultChecked={
                  values.is_online === undefined
                    ? true
                    : values.is_online === "on"
                }
                aria-describedby={
                  errors.is_online ? "is_online-error" : undefined
                }
                aria-invalid={Boolean(errors.is_online)}
              />
              <span>{fields.is_online}</span>
            </label>
            <FieldError id="is_online-error" error={errors.is_online} />
          </div>
        </div>
      </fieldset>

      <fieldset className="formSection">
        <legend>{sections.links.title}</legend>
        <p className="sectionDescription">{sections.links.description}</p>
        <div className="fieldGrid">
          {(
            [
              "registration_url",
              "bracket_url",
              "discord_url",
              "stream_url",
              "rules_url",
            ] as const
          ).map((name) => (
            <InputField
              key={name}
              name={name}
              label={fields[name]}
              type="url"
              maxLength={2_000}
              defaultValue={values[name]}
              error={errors[name]}
            />
          ))}
          <TextareaField
            name="organizer_notes"
            label={fields.organizer_notes}
            error={errors.organizer_notes}
          >
            {values.organizer_notes}
          </TextareaField>
        </div>
      </fieldset>

      <div className="consentBlock">
        <label className="checkboxLabel" htmlFor="consent_to_publish">
          <input
            id="consent_to_publish"
            name="consent_to_publish"
            type="checkbox"
            required
            defaultChecked={values.consent_to_publish === "on"}
            aria-describedby={
              errors.consent_to_publish ? "consent_to_publish-error" : undefined
            }
            aria-invalid={Boolean(errors.consent_to_publish)}
          />
          <span>{copy.form.consent}</span>
        </label>
        <FieldError
          id="consent_to_publish-error"
          error={errors.consent_to_publish}
        />
      </div>

      <div className="formActions">
        <SubmitButton
          submit={copy.form.submit}
          submitting={copy.form.submitting}
        />
        <Link className="textLink" href={localizePath(locale, "/tournaments")}>
          {copy.form.browse}
        </Link>
      </div>
    </form>
  );
}
