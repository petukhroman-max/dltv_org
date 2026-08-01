"use client";

/* eslint-disable @next/next/no-img-element -- team logos use validated arbitrary remote HTTP(S) URLs that cannot be safely allowlisted. */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { getSafeExternalUrl } from "@/lib/admin/presentation";
import type { AdminTournamentStage } from "@/lib/domain/tournament-stage";
import type { AdminTournamentTeam } from "@/lib/domain/tournament-team";
import {
  initialOperationalActionState,
  type OperationalActionState,
  type OperationalServerAction,
} from "@/lib/operational-workspace/action-state";

export type StagesTeamsActions = {
  createStage: OperationalServerAction;
  updateStage: OperationalServerAction;
  deleteStage: OperationalServerAction;
  createTeam: OperationalServerAction;
  updateTeam: OperationalServerAction;
  deleteTeam: OperationalServerAction;
};

function SubmitButton({
  pendingLabel,
  children,
}: {
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="primaryButton" type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

function ActionNotice({ state }: { state: OperationalActionState }) {
  if (!state.message && Object.keys(state.fieldErrors).length === 0)
    return null;
  return (
    <div
      className={state.status === "success" ? "adminNotice" : "formError"}
      role={state.status === "success" ? "status" : "alert"}
    >
      {state.message ? <p>{state.message}</p> : null}
      {Object.entries(state.fieldErrors).map(([field, message]) => (
        <p key={field}>{message}</p>
      ))}
    </div>
  );
}

function StageFields({
  stage,
  nextSequence,
}: {
  stage?: AdminTournamentStage;
  nextSequence?: number;
}) {
  return (
    <div className="operationalFormGrid">
      <label>
        Name
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={stage?.name ?? ""}
        />
      </label>
      <label>
        Type
        <select
          name="stage_type"
          defaultValue={stage?.stage_type ?? "qualifier"}
        >
          {[
            ["qualifier", "Qualifier"],
            ["group_stage", "Group stage"],
            ["swiss", "Swiss"],
            ["single_elimination", "Single elimination"],
            ["double_elimination", "Double elimination"],
            ["round_robin", "Round robin"],
            ["playoff", "Playoff"],
            ["final", "Final"],
            ["custom", "Custom"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sequence
        <input
          name="sequence_number"
          type="number"
          min={1}
          required
          defaultValue={stage?.sequence_number ?? nextSequence ?? 1}
        />
      </label>
      <label>
        Start (ISO with offset)
        <input
          name="start_at"
          placeholder="2026-08-10T10:00:00+02:00"
          defaultValue={stage?.start_at ?? ""}
        />
      </label>
      <label>
        End (ISO with offset)
        <input
          name="end_at"
          placeholder="2026-08-10T18:00:00+02:00"
          defaultValue={stage?.end_at ?? ""}
        />
      </label>
      <label>
        Timezone
        <input
          name="timezone"
          placeholder="Europe/Berlin"
          defaultValue={stage?.timezone ?? ""}
        />
      </label>
      <label>
        Format
        <input
          name="format_text"
          maxLength={200}
          defaultValue={stage?.format_text ?? ""}
        />
      </label>
      <label>
        Best of
        <select
          name="best_of_default"
          defaultValue={stage?.best_of_default?.toString() ?? ""}
        >
          <option value="">Not set</option>
          {[1, 3, 5, 7].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        Team count
        <input
          name="team_count"
          type="number"
          min={1}
          defaultValue={stage?.team_count ?? ""}
        />
      </label>
      <label>
        Location type
        <select
          name="is_online"
          defaultValue={stage?.is_online == null ? "" : String(stage.is_online)}
        >
          <option value="">Not set</option>
          <option value="true">Online</option>
          <option value="false">Offline</option>
        </select>
      </label>
      <label>
        Location name
        <input
          name="location_name"
          maxLength={300}
          defaultValue={stage?.location_name ?? ""}
        />
      </label>
      <label>
        Status
        <select name="status" defaultValue={stage?.status ?? "scheduled"}>
          {["scheduled", "live", "completed", "cancelled"].map((value) => (
            <option key={value} value={value}>
              {value.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="checkboxRow">
        <input
          name="is_public"
          type="checkbox"
          defaultChecked={stage?.is_public ?? true}
        />{" "}
        Mark ready for future public projection
      </label>
    </div>
  );
}

function TeamFields({ team }: { team?: AdminTournamentTeam }) {
  return (
    <div className="operationalFormGrid">
      <label>
        Name
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={team?.name ?? ""}
        />
      </label>
      <label>
        Short name
        <input
          name="short_name"
          maxLength={50}
          defaultValue={team?.short_name ?? ""}
        />
      </label>
      <label>
        Logo URL
        <input name="logo_url" type="url" defaultValue={team?.logo_url ?? ""} />
      </label>
      <label>
        Region
        <input
          name="region"
          maxLength={100}
          defaultValue={team?.region ?? ""}
        />
      </label>
      <label>
        Seed
        <input
          name="seed"
          type="number"
          min={1}
          defaultValue={team?.seed ?? ""}
        />
      </label>
      <label>
        Status
        <select name="status" defaultValue={team?.status ?? "active"}>
          {[
            "invited",
            "registered",
            "confirmed",
            "active",
            "eliminated",
            "withdrawn",
            "disqualified",
          ].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        External team ID
        <input
          name="external_team_id"
          maxLength={200}
          defaultValue={team?.external_team_id ?? ""}
        />
      </label>
      <label className="checkboxRow">
        <input
          name="is_public"
          type="checkbox"
          defaultChecked={team?.is_public ?? true}
        />{" "}
        Mark ready for future public projection
      </label>
    </div>
  );
}

function CreateStageForm({
  action,
  nextSequence,
}: {
  action: OperationalServerAction;
  nextSequence: number;
}) {
  const [state, formAction] = useActionState(
    action,
    initialOperationalActionState,
  );
  return (
    <details className="operationalEditor">
      <summary>Add stage</summary>
      <form action={formAction}>
        <StageFields nextSequence={nextSequence} />
        <ActionNotice state={state} />
        <SubmitButton pendingLabel="Saving stage…">Save stage</SubmitButton>
      </form>
    </details>
  );
}

function StageEditor({
  stage,
  updateAction,
  deleteAction,
}: {
  stage: AdminTournamentStage;
  updateAction: OperationalServerAction;
  deleteAction: OperationalServerAction;
}) {
  const [updateState, updateFormAction] = useActionState(
    updateAction,
    initialOperationalActionState,
  );
  const [deleteState, deleteFormAction] = useActionState(
    deleteAction,
    initialOperationalActionState,
  );
  return (
    <article className="operationalCard">
      <div className="operationalCardHeader">
        <div>
          <strong>
            {stage.sequence_number}. {stage.name}
          </strong>
          <p>
            {stage.stage_type.replaceAll("_", " ")} · {stage.status}
          </p>
        </div>
        <span>
          {stage.best_of_default ? `BO${stage.best_of_default}` : "BO not set"}
        </span>
      </div>
      <dl className="operationalFacts">
        <div>
          <dt>Dates</dt>
          <dd>
            {stage.start_at ?? "Not set"} — {stage.end_at ?? "Not set"}
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {stage.is_online === true
              ? "Online"
              : (stage.location_name ?? "Not set")}
          </dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{stage.format_text ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Teams</dt>
          <dd>{stage.team_count ?? "Not set"}</dd>
        </div>
      </dl>
      <details className="operationalEditor">
        <summary>Edit</summary>
        <form action={updateFormAction}>
          <input type="hidden" name="id" value={stage.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={stage.updated_at}
          />
          <StageFields stage={stage} />
          <ActionNotice state={updateState} />
          <SubmitButton pendingLabel="Saving stage…">Save changes</SubmitButton>
        </form>
      </details>
      <details className="deleteConfirmation">
        <summary>Delete</summary>
        <p>Delete this unused stage? This cannot be undone.</p>
        <form action={deleteFormAction}>
          <input type="hidden" name="id" value={stage.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={stage.updated_at}
          />
          <ActionNotice state={deleteState} />
          <SubmitButton pendingLabel="Deleting stage…">
            Delete stage
          </SubmitButton>
        </form>
      </details>
    </article>
  );
}

function CreateTeamForm({ action }: { action: OperationalServerAction }) {
  const [state, formAction] = useActionState(
    action,
    initialOperationalActionState,
  );
  return (
    <details className="operationalEditor">
      <summary>Add team</summary>
      <form action={formAction}>
        <TeamFields />
        <ActionNotice state={state} />
        <SubmitButton pendingLabel="Saving team…">Save team</SubmitButton>
      </form>
    </details>
  );
}

function TeamEditor({
  team,
  updateAction,
  deleteAction,
}: {
  team: AdminTournamentTeam;
  updateAction: OperationalServerAction;
  deleteAction: OperationalServerAction;
}) {
  const [updateState, updateFormAction] = useActionState(
    updateAction,
    initialOperationalActionState,
  );
  const [deleteState, deleteFormAction] = useActionState(
    deleteAction,
    initialOperationalActionState,
  );
  const logo = getSafeExternalUrl(team.logo_url);
  return (
    <article className="operationalCard">
      <div className="operationalCardHeader">
        <div>
          <strong>{team.name}</strong>
          <p>
            {team.short_name ?? "No short name"} · {team.region ?? "No region"}
          </p>
        </div>
        {logo ? (
          <img className="teamLogo" src={logo} alt="" width={48} height={48} />
        ) : null}
      </div>
      <dl className="operationalFacts">
        <div>
          <dt>Seed</dt>
          <dd>{team.seed ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{team.status}</dd>
        </div>
      </dl>
      <details className="operationalEditor">
        <summary>Edit</summary>
        <form action={updateFormAction}>
          <input type="hidden" name="id" value={team.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={team.updated_at}
          />
          <TeamFields team={team} />
          <ActionNotice state={updateState} />
          <SubmitButton pendingLabel="Saving team…">Save changes</SubmitButton>
        </form>
      </details>
      <details className="deleteConfirmation">
        <summary>Delete</summary>
        <p>Delete this unused team? This cannot be undone.</p>
        <form action={deleteFormAction}>
          <input type="hidden" name="id" value={team.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={team.updated_at}
          />
          <ActionNotice state={deleteState} />
          <SubmitButton pendingLabel="Deleting team…">Delete team</SubmitButton>
        </form>
      </details>
    </article>
  );
}

export function StagesTeamsWorkspace({
  stages,
  teams,
  actions,
}: {
  stages: AdminTournamentStage[];
  teams: AdminTournamentTeam[];
  actions: StagesTeamsActions;
}) {
  const nextSequence =
    Math.max(0, ...stages.map((stage) => stage.sequence_number)) + 1;
  return (
    <div className="operationalWorkspace">
      <section className="adminPanel" aria-labelledby="workspace-stages">
        <div className="adminPanelHeading">
          <div>
            <h2 id="workspace-stages">Stages</h2>
            <p className="supportingText">Sequence controls display order.</p>
          </div>
          <CreateStageForm
            action={actions.createStage}
            nextSequence={nextSequence}
          />
        </div>
        {stages.length === 0 ? (
          <p className="adminEmpty">No stages added.</p>
        ) : (
          <div className="operationalCards">
            {stages.map((stage) => (
              <StageEditor
                key={stage.id}
                stage={stage}
                updateAction={actions.updateStage}
                deleteAction={actions.deleteStage}
              />
            ))}
          </div>
        )}
      </section>
      <section className="adminPanel" aria-labelledby="workspace-teams">
        <div className="adminPanelHeading">
          <div>
            <h2 id="workspace-teams">Teams</h2>
            <p className="supportingText">
              Roster management will be added next.
            </p>
          </div>
          <CreateTeamForm action={actions.createTeam} />
        </div>
        {teams.length === 0 ? (
          <p className="adminEmpty">No teams added.</p>
        ) : (
          <div className="operationalCards">
            {teams.map((team) => (
              <TeamEditor
                key={team.id}
                team={team}
                updateAction={actions.updateTeam}
                deleteAction={actions.deleteTeam}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
