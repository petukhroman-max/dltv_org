"use client";

/* eslint-disable @next/next/no-img-element -- team logos use validated arbitrary remote HTTP(S) URLs that cannot be safely allowlisted. */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";
import { getSafeExternalUrl } from "@/lib/admin/presentation";
import type { AdminTournamentStage } from "@/lib/domain/tournament-stage";
import type { AdminTournamentTeam } from "@/lib/domain/tournament-team";
import {
  initialOperationalActionState,
  type OperationalActionState,
  type OperationalServerAction,
} from "@/lib/operational-workspace/action-state";
import {
  localizedOperationalMessage,
  OperationalI18nProvider,
  useOperationalCopy,
} from "@/components/operational/operational-i18n";

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
  const copy = useOperationalCopy();
  if (!state.message && Object.keys(state.fieldErrors).length === 0)
    return null;
  return (
    <div
      className={state.status === "success" ? "adminNotice" : "formError"}
      role={state.status === "success" ? "status" : "alert"}
    >
      {state.message ? (
        <p>{localizedOperationalMessage(state.message, copy)}</p>
      ) : null}
      {Object.entries(state.fieldErrors).map(([field, message]) => (
        <p key={field}>{message ? copy.genericError : null}</p>
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
  const copy = useOperationalCopy();
  return (
    <div className="operationalFormGrid">
      <label>
        {copy.name}
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={stage?.name ?? ""}
        />
      </label>
      <label>
        {copy.type}
        <select
          name="stage_type"
          defaultValue={stage?.stage_type ?? "qualifier"}
        >
          {[
            ["qualifier", copy.qualifier],
            ["group_stage", copy.group_stage],
            ["swiss", copy.swiss],
            ["single_elimination", copy.single_elimination],
            ["double_elimination", copy.double_elimination],
            ["round_robin", copy.round_robin],
            ["playoff", copy.playoff],
            ["final", copy.final],
            ["custom", copy.custom],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {copy.sequence}
        <input
          name="sequence_number"
          type="number"
          min={1}
          required
          defaultValue={stage?.sequence_number ?? nextSequence ?? 1}
        />
      </label>
      <label>
        {copy.start}
        <input
          name="start_at"
          placeholder="2026-08-10T10:00:00+02:00"
          defaultValue={stage?.start_at ?? ""}
        />
      </label>
      <label>
        {copy.end}
        <input
          name="end_at"
          placeholder="2026-08-10T18:00:00+02:00"
          defaultValue={stage?.end_at ?? ""}
        />
      </label>
      <label>
        {copy.timezone}
        <input
          name="timezone"
          placeholder="Europe/Berlin"
          defaultValue={stage?.timezone ?? ""}
        />
      </label>
      <label>
        {copy.format}
        <input
          name="format_text"
          maxLength={200}
          defaultValue={stage?.format_text ?? ""}
        />
      </label>
      <label>
        {copy.bestOf}
        <select
          name="best_of_default"
          defaultValue={stage?.best_of_default?.toString() ?? ""}
        >
          <option value="">{copy.notSet}</option>
          {[1, 3, 5, 7].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        {copy.teamCount}
        <input
          name="team_count"
          type="number"
          min={1}
          defaultValue={stage?.team_count ?? ""}
        />
      </label>
      <label>
        {copy.locationType}
        <select
          name="is_online"
          defaultValue={stage?.is_online == null ? "" : String(stage.is_online)}
        >
          <option value="">{copy.notSet}</option>
          <option value="true">{copy.online}</option>
          <option value="false">{copy.offline}</option>
        </select>
      </label>
      <label>
        {copy.locationName}
        <input
          name="location_name"
          maxLength={300}
          defaultValue={stage?.location_name ?? ""}
        />
      </label>
      <label>
        {copy.status}
        <select name="status" defaultValue={stage?.status ?? "scheduled"}>
          {["scheduled", "live", "completed", "cancelled"].map((value) => (
            <option key={value} value={value}>
              {copy[value as "scheduled" | "live" | "completed" | "cancelled"]}
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
        {copy.publicReady}
      </label>
    </div>
  );
}

function TeamFields({ team }: { team?: AdminTournamentTeam }) {
  const copy = useOperationalCopy();
  return (
    <div className="operationalFormGrid">
      <label>
        {copy.name}
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={team?.name ?? ""}
        />
      </label>
      <label>
        {copy.shortName}
        <input
          name="short_name"
          maxLength={50}
          defaultValue={team?.short_name ?? ""}
        />
      </label>
      <label>
        {copy.logoUrl}
        <input name="logo_url" type="url" defaultValue={team?.logo_url ?? ""} />
      </label>
      <label>
        {copy.region}
        <input
          name="region"
          maxLength={100}
          defaultValue={team?.region ?? ""}
        />
      </label>
      <label>
        {copy.seed}
        <input
          name="seed"
          type="number"
          min={1}
          defaultValue={team?.seed ?? ""}
        />
      </label>
      <label>
        {copy.status}
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
              {
                copy[
                  value as
                    | "invited"
                    | "registered"
                    | "confirmed"
                    | "active"
                    | "eliminated"
                    | "withdrawn"
                    | "disqualified"
                ]
              }
            </option>
          ))}
        </select>
      </label>
      <label>
        {copy.externalTeamId}
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
        {copy.publicReady}
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
  const copy = useOperationalCopy();
  const [state, formAction] = useActionState(
    action,
    initialOperationalActionState,
  );
  return (
    <details className="operationalEditor">
      <summary>{copy.addStage}</summary>
      <form action={formAction}>
        <StageFields nextSequence={nextSequence} />
        <ActionNotice state={state} />
        <SubmitButton pendingLabel={copy.savingStage}>
          {copy.saveStage}
        </SubmitButton>
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
  const copy = useOperationalCopy();
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
            {copy[stage.stage_type as keyof typeof copy] as string} ·{" "}
            {copy[stage.status as keyof typeof copy] as string}
          </p>
        </div>
        <span>
          {stage.best_of_default
            ? `BO${stage.best_of_default}`
            : `BO ${copy.notSet}`}
        </span>
      </div>
      <dl className="operationalFacts">
        <div>
          <dt>{copy.dates}</dt>
          <dd>
            {stage.start_at ?? copy.notSet} — {stage.end_at ?? copy.notSet}
          </dd>
        </div>
        <div>
          <dt>{copy.location}</dt>
          <dd>
            {stage.is_online === true
              ? copy.online
              : (stage.location_name ?? copy.notSet)}
          </dd>
        </div>
        <div>
          <dt>{copy.format}</dt>
          <dd>{stage.format_text ?? copy.notSet}</dd>
        </div>
        <div>
          <dt>{copy.teams}</dt>
          <dd>{stage.team_count ?? copy.notSet}</dd>
        </div>
      </dl>
      <details className="operationalEditor">
        <summary>{copy.edit}</summary>
        <form action={updateFormAction}>
          <input type="hidden" name="id" value={stage.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={stage.updated_at}
          />
          <StageFields stage={stage} />
          <ActionNotice state={updateState} />
          <SubmitButton pendingLabel={copy.savingStage}>
            {copy.saveChanges}
          </SubmitButton>
        </form>
      </details>
      <div className="deleteConfirmation">
        <ConfirmationDialog
          trigger={copy.delete}
          title={copy.deleteStage}
          description={copy.deleteStageQuestion(stage.name)}
          cancelLabel={copy.cancel}
        >
          <form action={deleteFormAction}>
            <input type="hidden" name="id" value={stage.id} />
            <input
              type="hidden"
              name="expected_updated_at"
              value={stage.updated_at}
            />
            <ActionNotice state={deleteState} />
            <SubmitButton pendingLabel={copy.deletingStage}>
              {copy.deleteStage}
            </SubmitButton>
          </form>
        </ConfirmationDialog>
      </div>
    </article>
  );
}

function CreateTeamForm({ action }: { action: OperationalServerAction }) {
  const copy = useOperationalCopy();
  const [state, formAction] = useActionState(
    action,
    initialOperationalActionState,
  );
  return (
    <details className="operationalEditor">
      <summary>{copy.addTeam}</summary>
      <form action={formAction}>
        <TeamFields />
        <ActionNotice state={state} />
        <SubmitButton pendingLabel={copy.savingTeam}>
          {copy.saveTeam}
        </SubmitButton>
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
  const copy = useOperationalCopy();
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
            {team.short_name ?? copy.noShortName} ·{" "}
            {team.region ?? copy.noRegion}
          </p>
        </div>
        {logo ? (
          <img className="teamLogo" src={logo} alt="" width={48} height={48} />
        ) : null}
      </div>
      <dl className="operationalFacts">
        <div>
          <dt>{copy.seed}</dt>
          <dd>{team.seed ?? copy.notSet}</dd>
        </div>
        <div>
          <dt>{copy.status}</dt>
          <dd>{copy[team.status as keyof typeof copy] as string}</dd>
        </div>
      </dl>
      <a className="secondaryButton" href={`#roster-${team.id}`}>
        {copy.manageRoster}
      </a>
      <details className="operationalEditor">
        <summary>{copy.edit}</summary>
        <form action={updateFormAction}>
          <input type="hidden" name="id" value={team.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={team.updated_at}
          />
          <TeamFields team={team} />
          <ActionNotice state={updateState} />
          <SubmitButton pendingLabel={copy.savingTeam}>
            {copy.saveChanges}
          </SubmitButton>
        </form>
      </details>
      <div className="deleteConfirmation">
        <ConfirmationDialog
          trigger={copy.delete}
          title={copy.deleteTeam}
          description={copy.deleteTeamQuestion(team.name)}
          cancelLabel={copy.cancel}
        >
          <form action={deleteFormAction}>
            <input type="hidden" name="id" value={team.id} />
            <input
              type="hidden"
              name="expected_updated_at"
              value={team.updated_at}
            />
            <ActionNotice state={deleteState} />
            <SubmitButton pendingLabel={copy.deletingTeam}>
              {copy.deleteTeam}
            </SubmitButton>
          </form>
        </ConfirmationDialog>
      </div>
    </article>
  );
}

export function StagesTeamsWorkspace({
  stages,
  teams,
  actions,
  locale = "en",
}: {
  stages: AdminTournamentStage[];
  teams: AdminTournamentTeam[];
  actions: StagesTeamsActions;
  locale?: Locale;
}) {
  return (
    <OperationalI18nProvider locale={locale}>
      <StagesTeamsWorkspaceContent
        stages={stages}
        teams={teams}
        actions={actions}
      />
    </OperationalI18nProvider>
  );
}

function StagesTeamsWorkspaceContent({
  stages,
  teams,
  actions,
}: {
  stages: AdminTournamentStage[];
  teams: AdminTournamentTeam[];
  actions: StagesTeamsActions;
}) {
  const copy = useOperationalCopy();
  const nextSequence =
    Math.max(0, ...stages.map((stage) => stage.sequence_number)) + 1;
  return (
    <div className="operationalWorkspace">
      <section className="adminPanel" aria-labelledby="workspace-stages">
        <div className="adminPanelHeading">
          <div>
            <h2 id="workspace-stages">{copy.stagesTitle}</h2>
            <p className="supportingText">{copy.stagesHelp}</p>
          </div>
          <CreateStageForm
            action={actions.createStage}
            nextSequence={nextSequence}
          />
        </div>
        {stages.length === 0 ? (
          <EmptyState
            title={copy.stagesEmptyTitle}
            description={copy.stagesEmpty}
          />
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
            <h2 id="workspace-teams">{copy.teamsTitle}</h2>
            <p className="supportingText">{copy.teamsHelp}</p>
          </div>
          <CreateTeamForm action={actions.createTeam} />
        </div>
        {teams.length === 0 ? (
          <EmptyState
            title={copy.teamsEmptyTitle}
            description={copy.teamsEmpty}
          />
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
