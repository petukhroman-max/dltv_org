"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  approveSubmissionAction,
  initialModerationActionState,
  publishSubmissionAction,
  rejectSubmissionAction,
  requestChangesAction,
  type ModerationActionState,
} from "@/app/admin/(protected)/submissions/[id]/actions";
import { adminCopy } from "@/lib/admin/copy";
import type { SubmissionStatus } from "@/lib/domain/submission";

type ModerationAction = (
  state: ModerationActionState,
  formData: FormData,
) => Promise<ModerationActionState>;

type ActionConfiguration = {
  id: string;
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  noteRequired?: boolean;
  confirmationLabel?: string;
  action: ModerationAction;
};

const actionConfigurations = {
  approve: {
    id: "approve",
    title: "Approve",
    description: "Mark this submitted tournament as approved.",
    submitLabel: "Confirm approval",
    pendingLabel: "Approving…",
    confirmationLabel: "I confirm that this submission is ready for approval.",
    action: approveSubmissionAction,
  },
  requestChanges: {
    id: "request-changes",
    title: "Request changes",
    description: "Return the submission to the organizer with a required note.",
    submitLabel: "Send change request",
    pendingLabel: "Sending request…",
    noteRequired: true,
    action: requestChangesAction,
  },
  reject: {
    id: "reject",
    title: "Reject",
    description: "Reject this submission with a required reviewer note.",
    submitLabel: "Confirm rejection",
    pendingLabel: "Rejecting…",
    noteRequired: true,
    confirmationLabel: "I confirm that this submission should be rejected.",
    action: rejectSubmissionAction,
  },
  publish: {
    id: "publish",
    title: "Publish",
    description: "Publish this approved tournament.",
    submitLabel: "Publish tournament",
    pendingLabel: "Publishing…",
    confirmationLabel: "I confirm that this tournament is ready to publish.",
    action: publishSubmissionAction,
  },
} satisfies Record<string, ActionConfiguration>;

const actionsByStatus: Partial<
  Record<SubmissionStatus, ActionConfiguration[]>
> = {
  submitted: [
    actionConfigurations.approve,
    actionConfigurations.requestChanges,
    actionConfigurations.reject,
  ],
  approved: [actionConfigurations.publish, actionConfigurations.requestChanges],
  published: [actionConfigurations.requestChanges],
};

export function ModerationSubmitButtonView({
  label,
  pendingLabel,
  pending,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
}) {
  return (
    <button className="primaryButton" type="submit" disabled={pending}>
      <span aria-live="polite">{pending ? pendingLabel : label}</span>
    </button>
  );
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <ModerationSubmitButtonView
      label={label}
      pendingLabel={pendingLabel}
      pending={pending}
    />
  );
}

export function ModerationActionFeedback({
  state,
}: {
  state: ModerationActionState;
}) {
  if (!state.message) {
    return null;
  }
  return (
    <p
      className={state.status === "success" ? "adminNotice" : "formError"}
      role={state.status === "success" ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function ModerationForm({
  config,
  submissionId,
  expectedStatus,
}: {
  config: ActionConfiguration;
  submissionId: string;
  expectedStatus: SubmissionStatus;
}) {
  const [state, action] = useActionState(
    config.action,
    initialModerationActionState,
  );
  const noteErrorId = state.fieldErrors?.reviewer_note
    ? `${config.id}-note-error`
    : undefined;
  const confirmationErrorId = state.fieldErrors?.confirmed
    ? `${config.id}-confirmation-error`
    : undefined;

  return (
    <form className="moderationForm" action={action}>
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="expected_status" value={expectedStatus} />
      <div>
        <h3>{config.title}</h3>
        <p className="supportingText">{config.description}</p>
      </div>
      <label className="field">
        <span>
          Reviewer note{config.noteRequired ? " (required)" : " (optional)"}
        </span>
        <textarea
          name="reviewer_note"
          maxLength={2000}
          required={config.noteRequired}
          aria-invalid={Boolean(noteErrorId)}
          aria-describedby={noteErrorId}
        />
        {state.fieldErrors?.reviewer_note ? (
          <span className="fieldError" id={noteErrorId} role="alert">
            {state.fieldErrors.reviewer_note}
          </span>
        ) : null}
      </label>
      {config.confirmationLabel ? (
        <div>
          <label className="checkboxLabel">
            <input
              type="checkbox"
              name="confirmed"
              required
              aria-invalid={Boolean(confirmationErrorId)}
              aria-describedby={confirmationErrorId}
            />
            <span>{config.confirmationLabel}</span>
          </label>
          {state.fieldErrors?.confirmed ? (
            <p className="fieldError" id={confirmationErrorId} role="alert">
              {state.fieldErrors.confirmed}
            </p>
          ) : null}
        </div>
      ) : null}
      <ModerationActionFeedback state={state} />
      <SubmitButton
        label={config.submitLabel}
        pendingLabel={config.pendingLabel}
      />
    </form>
  );
}

export function AdminModerationPanel({
  submissionId,
  status,
}: {
  submissionId: string;
  status: SubmissionStatus;
}) {
  const actions = actionsByStatus[status] ?? [];
  const readOnlyMessage =
    status === "needs_changes"
      ? "Waiting for organizer changes."
      : status === "rejected"
        ? "This submission was rejected."
        : status === "draft"
          ? "Draft submissions cannot be moderated."
          : null;

  return (
    <section className="adminPanel" aria-labelledby="moderation-heading">
      <h2 id="moderation-heading">{adminCopy.details.moderation}</h2>
      <p className="adminWarning">
        Organizer notifications are not enabled yet.
      </p>
      {readOnlyMessage ? (
        <p className="supportingText">{readOnlyMessage}</p>
      ) : null}
      {actions.length > 0 ? (
        <div className="moderationGrid">
          {actions.map((config) => (
            <ModerationForm
              key={config.id}
              config={config}
              submissionId={submissionId}
              expectedStatus={status}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
