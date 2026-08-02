"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

type LinkCandidate = { id: string; label: string };

function ResolveButton({
  label,
  pendingLabel,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className="secondaryButton"
      type="submit"
      disabled={pending || disabled}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ImportConflictResolutionForm({
  action,
  sessionId,
  sessionVersion,
  rowId,
  candidates,
  canKeepExisting,
  highRiskCompletedResult,
  copy,
}: {
  action: (formData: FormData) => Promise<void>;
  sessionId: string;
  sessionVersion: string;
  rowId: string;
  candidates: LinkCandidate[];
  canKeepExisting: boolean;
  highRiskCompletedResult: boolean;
  copy: {
    resolve: string;
    resolving: string;
    keep: string;
    useSheet: string;
    skipRow: string;
    link: string;
    createNew: string;
    existingEntitySearch: string;
    existingEntityPlaceholder: string;
    highRisk: string;
  };
}) {
  const [decision, setDecision] = useState(
    canKeepExisting ? "keep_existing" : "skip",
  );
  const [candidateLabel, setCandidateLabel] = useState("");
  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.label === candidateLabel),
    [candidateLabel, candidates],
  );
  const listId = `import-link-candidates-${rowId}`;
  return (
    <form action={action} className="importResolutionForm">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="sessionVersion" value={sessionVersion} />
      <input type="hidden" name="rowId" value={rowId} />
      <label>
        {copy.resolve}
        <select
          name="decision"
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
        >
          {canKeepExisting ? (
            <option value="keep_existing">{copy.keep}</option>
          ) : null}
          <option value="use_spreadsheet">{copy.useSheet}</option>
          <option value="skip">{copy.skipRow}</option>
          {candidates.length ? (
            <option value="link_existing">{copy.link}</option>
          ) : null}
          <option value="create_new">{copy.createNew}</option>
        </select>
      </label>
      {decision === "link_existing" ? (
        <label>
          {copy.existingEntitySearch}
          <input
            type="search"
            list={listId}
            value={candidateLabel}
            placeholder={copy.existingEntityPlaceholder}
            onChange={(event) => setCandidateLabel(event.target.value)}
            required
          />
          <datalist id={listId}>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.label} />
            ))}
          </datalist>
          <input
            type="hidden"
            name="existingEntityId"
            value={selectedCandidate?.id ?? ""}
          />
        </label>
      ) : null}
      {decision === "use_spreadsheet" && highRiskCompletedResult ? (
        <label className="checkboxLabel">
          <input
            type="checkbox"
            name="confirmedCompletedResultOverwrite"
            value="true"
          />
          {copy.highRisk}
        </label>
      ) : null}
      <ResolveButton
        label={copy.resolve}
        pendingLabel={copy.resolving}
        disabled={decision === "link_existing" && !selectedCandidate}
      />
    </form>
  );
}
