"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { resubmitTournamentAction } from "@/app/edit-submission/[token]/actions";
import type { Locale } from "@/i18n/config";
import {
  getPublicSubmissionCopy,
  popularTimezones,
} from "@/lib/submissions/public-submission.copy";
import {
  organizerEditFieldNames,
  type EditableSubmission,
  type OrganizerEditActionState,
  type OrganizerEditFieldName,
  type OrganizerEditValues,
} from "@/lib/organizer-edit/organizer-edit.types";

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return (
    <button className="primaryButton" type="submit" disabled={pending}>
      <span aria-live="polite">
        {pending
          ? locale === "ru"
            ? "Отправка изменений…"
            : "Submitting changes…"
          : locale === "ru"
            ? "Повторно отправить турнир"
            : "Resubmit tournament"}
      </span>
    </button>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  maxLength,
  value,
  error,
  list,
}: {
  name: OrganizerEditFieldName;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  value?: string;
  error?: string;
  list?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        min={type === "number" ? 1 : undefined}
        step={type === "number" ? 1 : undefined}
        list={list}
        defaultValue={value}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
      />
      {error ? (
        <p className="fieldError" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Textarea({
  name,
  label,
  value,
  error,
}: {
  name: OrganizerEditFieldName;
  label: string;
  value?: string;
  error?: string;
}) {
  return (
    <div className="field fieldWide">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        maxLength={4_000}
        defaultValue={value}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="fieldError">{error}</p> : null}
    </div>
  );
}

function initialValues(submission: EditableSubmission): OrganizerEditValues {
  return {
    tournament_name: submission.tournament_name,
    description: submission.description ?? "",
    region: submission.region,
    language: submission.language ?? "",
    start_date: submission.start_date,
    end_date: submission.end_date,
    timezone: submission.timezone,
    format: submission.format ?? "",
    prize_pool_text: submission.prize_pool_text ?? "",
    registration_url: submission.registration_url ?? "",
    bracket_url: submission.bracket_url ?? "",
    discord_url: submission.discord_url ?? "",
    stream_url: submission.stream_url ?? "",
    rules_url: submission.rules_url ?? "",
    is_online: submission.is_online ? "on" : "",
    max_teams: submission.max_teams?.toString() ?? "",
    registration_deadline: submission.registration_deadline ?? "",
    organizer_notes: submission.organizer_notes ?? "",
  };
}

export function OrganizerEditForm({
  token,
  submission,
  locale = "en",
}: {
  token: string;
  submission: EditableSubmission;
  locale?: Locale;
}) {
  const startingState: OrganizerEditActionState = {
    status: "idle",
    fieldErrors: {},
    values: initialValues(submission),
  };
  const [state, action] = useActionState(
    resubmitTournamentAction.bind(null, token),
    startingState,
  );
  const copy = getPublicSubmissionCopy(locale);
  const { fields } = copy.form;
  const values = state.values;
  const errors =
    locale === "ru"
      ? (Object.fromEntries(
          Object.keys(state.fieldErrors).map((field) => [
            field,
            field === "confirmed"
              ? copy.errors.consent
              : (copy.errors.invalid[
                  field as keyof typeof copy.errors.invalid
                ] ?? copy.errors.generic),
          ]),
        ) as OrganizerEditActionState["fieldErrors"])
      : state.fieldErrors;

  useEffect(() => {
    const first = organizerEditFieldNames.find((name) => errors[name]);
    if (first) document.getElementById(first)?.focus();
  }, [errors]);

  return (
    <form className="submissionForm" action={action} noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.formError ? (
        <div className="formError" role="alert">
          {locale === "ru" ? copy.errors.generic : state.formError}
        </div>
      ) : null}
      {submission.reviewer_notes ? (
        <section className="formSection" aria-labelledby="changes-requested">
          <h2 id="changes-requested">
            {locale === "ru"
              ? "Изменения, запрошенные DLTV"
              : "Changes requested by DLTV"}
          </h2>
          <p className="supportingText">{submission.reviewer_notes}</p>
        </section>
      ) : null}
      <fieldset className="formSection">
        <legend>
          {locale === "ru" ? "Сведения о турнире" : "Tournament details"}
        </legend>
        <div className="fieldGrid">
          <Field
            name="tournament_name"
            label={fields.tournament_name}
            required
            maxLength={300}
            value={values.tournament_name}
            error={errors.tournament_name}
          />
          <Textarea
            name="description"
            label={fields.description}
            value={values.description}
            error={errors.description}
          />
          <Field
            name="region"
            label={fields.region}
            required
            maxLength={100}
            value={values.region}
            error={errors.region}
          />
          <Field
            name="language"
            label={fields.language}
            maxLength={100}
            value={values.language}
            error={errors.language}
          />
          <Field
            name="start_date"
            label={fields.start_date}
            type="date"
            required
            value={values.start_date}
            error={errors.start_date}
          />
          <Field
            name="end_date"
            label={fields.end_date}
            type="date"
            required
            value={values.end_date}
            error={errors.end_date}
          />
          <Field
            name="timezone"
            label={fields.timezone}
            required
            maxLength={100}
            list="edit-timezones"
            value={values.timezone}
            error={errors.timezone}
          />
          <datalist id="edit-timezones">
            {popularTimezones.map((timezone) => (
              <option value={timezone} key={timezone} />
            ))}
          </datalist>
          <Field
            name="format"
            label={fields.format}
            maxLength={200}
            value={values.format}
            error={errors.format}
          />
          <Field
            name="prize_pool_text"
            label={fields.prize_pool_text}
            maxLength={200}
            value={values.prize_pool_text}
            error={errors.prize_pool_text}
          />
          <Field
            name="max_teams"
            label={fields.max_teams}
            type="number"
            value={values.max_teams}
            error={errors.max_teams}
          />
          <Field
            name="registration_deadline"
            label={fields.registration_deadline}
            maxLength={64}
            value={values.registration_deadline}
            error={errors.registration_deadline}
          />
          <div className="field fieldWide">
            <label className="checkboxLabel" htmlFor="is_online">
              <input
                id="is_online"
                name="is_online"
                type="checkbox"
                defaultChecked={values.is_online === "on"}
              />
              <span>{fields.is_online}</span>
            </label>
          </div>
        </div>
      </fieldset>
      <fieldset className="formSection">
        <legend>
          {locale === "ru"
            ? "Ссылки и примечания организатора"
            : "Links and organizer notes"}
        </legend>
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
            <Field
              key={name}
              name={name}
              label={fields[name]}
              type="url"
              maxLength={2_000}
              value={values[name]}
              error={errors[name]}
            />
          ))}
          <Textarea
            name="organizer_notes"
            label={fields.organizer_notes}
            value={values.organizer_notes}
            error={errors.organizer_notes}
          />
        </div>
      </fieldset>
      <div className="consentBlock">
        <label className="checkboxLabel" htmlFor="confirmed">
          <input
            id="confirmed"
            name="confirmed"
            type="checkbox"
            required
            defaultChecked={values.confirmed === "on"}
            aria-invalid={Boolean(errors.confirmed)}
          />
          <span>
            {locale === "ru"
              ? "Подтверждаю правильность обновлённых сведений о турнире."
              : "I confirm that the updated tournament information is accurate."}
          </span>
        </label>
        {errors.confirmed ? (
          <p className="fieldError">{errors.confirmed}</p>
        ) : null}
      </div>
      <div className="formActions">
        <SubmitButton locale={locale} />
      </div>
    </form>
  );
}
