"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  localizedOperationalMessage,
  OperationalI18nProvider,
  useOperationalCopy,
  useOperationalLocale,
} from "@/components/operational/operational-i18n";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";
import type { SafeRosterMember } from "@/lib/domain/roster-management";
import type { AdminTournamentTeam } from "@/lib/domain/tournament-team";
import {
  initialRosterActionState,
  initialRosterSearchState,
  type RosterActionState,
  type RosterSearchServerAction,
  type RosterServerAction,
} from "@/lib/operational-workspace/roster-action-state";

export type RosterActions = {
  createPlayer: RosterServerAction;
  addExisting: RosterServerAction;
  updatePlayer: RosterServerAction;
  updateMembership: RosterServerAction;
  remove: RosterServerAction;
  restore: RosterServerAction;
  search: RosterSearchServerAction;
};

const roles = ["player", "substitute", "coach", "manager"] as const;
function Submit({
  pending,
  children,
}: {
  pending: string;
  children: React.ReactNode;
}) {
  const status = useFormStatus();
  return (
    <button className="primaryButton" type="submit" disabled={status.pending}>
      {status.pending ? pending : children}
    </button>
  );
}

function Notice({ state }: { state: RosterActionState }) {
  const copy = useOperationalCopy();
  const locale = useOperationalLocale();
  if (!state.message && !Object.keys(state.fieldErrors).length) return null;
  return (
    <div
      className={state.status === "success" ? "adminNotice" : "formError"}
      role={state.status === "success" ? "status" : "alert"}
    >
      {state.message ? (
        <p>
          {locale === "en"
            ? state.message
            : localizedOperationalMessage(state.message, copy)}
        </p>
      ) : null}
      {Object.entries(state.fieldErrors).map(([name, value]) => (
        <p key={name}>{locale === "en" ? value : copy.genericError}</p>
      ))}
    </div>
  );
}

function RoleFields({
  defaultRole = "player",
  captain = false,
}: {
  defaultRole?: string;
  captain?: boolean;
}) {
  const copy = useOperationalCopy();
  const locale = useOperationalLocale();
  return (
    <>
      <label>
        {copy.role}
        <select name="role" defaultValue={defaultRole}>
          {roles.map((role) => (
            <option key={role} value={role}>
              {copy[role]}
            </option>
          ))}
        </select>
      </label>
      <label className="checkboxRow">
        <input name="is_captain" type="checkbox" defaultChecked={captain} />{" "}
        {copy.captainLabel}
      </label>
      <p className="supportingText">
        {locale === "ru"
          ? "Назначение нового капитана заменит текущего. Капитаном может быть только игрок."
          : "Assigning this player as captain will replace the current captain. Only the player role can be captain."}
      </p>
    </>
  );
}

function PlayerFields({ member }: { member?: SafeRosterMember }) {
  const copy = useOperationalCopy();
  return (
    <div className="operationalFormGrid">
      <label>
        {copy.displayName}
        <input
          name="display_name"
          required
          maxLength={80}
          defaultValue={member?.player.display_name ?? ""}
        />
      </label>
      <label>
        {copy.countryCode}
        <input
          name="country_code"
          maxLength={2}
          placeholder="US"
          defaultValue={member?.player.country_code ?? ""}
        />
      </label>
      <label>
        {copy.steamId}
        <input
          name="steam_id"
          maxLength={100}
          defaultValue={member?.player.steam_id ?? ""}
        />
      </label>
      <label>
        {copy.deadlockId}
        <input
          name="deadlock_account_id"
          maxLength={100}
          defaultValue={member?.player.deadlock_account_id ?? ""}
        />
      </label>
    </div>
  );
}

function CreatePlayer({
  teamId,
  action,
}: {
  teamId: string;
  action: RosterServerAction;
}) {
  const copy = useOperationalCopy();
  const [state, formAction] = useActionState(action, initialRosterActionState);
  return (
    <details className="operationalEditor">
      <summary>{copy.createPlayer}</summary>
      <form action={formAction}>
        <input type="hidden" name="tournament_team_id" value={teamId} />
        <PlayerFields />
        <div className="operationalFormGrid">
          <RoleFields />
          <label>
            {copy.joinedAt}
            <input name="joined_at" placeholder="2026-08-01T10:00:00+00:00" />
          </label>
        </div>
        <label className="checkboxRow">
          <input name="confirm_same_name" type="checkbox" /> {copy.sameName}
        </label>
        <Notice state={state} />
        <Submit pending={copy.addingPlayer}>{copy.addPlayer}</Submit>
      </form>
    </details>
  );
}

function SearchAndAdd({
  teamId,
  search,
  add,
}: {
  teamId: string;
  search: RosterSearchServerAction;
  add: RosterServerAction;
}) {
  const copy = useOperationalCopy();
  const [searchState, searchAction] = useActionState(
    search,
    initialRosterSearchState,
  );
  return (
    <details className="operationalEditor">
      <summary>{copy.findPlayer}</summary>
      <form action={searchAction} className="inlineForm">
        <label>
          {copy.query}
          <input
            name="query"
            minLength={2}
            maxLength={100}
            required
            defaultValue={searchState.values.query ?? ""}
          />
        </label>
        <Submit pending={copy.searching}>{copy.search}</Submit>
      </form>
      <Notice state={searchState} />
      {searchState.results.map((player) => (
        <ExistingResult
          key={player.id}
          teamId={teamId}
          player={player}
          action={add}
        />
      ))}
    </details>
  );
}

function ExistingResult({
  teamId,
  player,
  action,
}: {
  teamId: string;
  player: SafeRosterMember["player"];
  action: RosterServerAction;
}) {
  const copy = useOperationalCopy();
  const [state, formAction] = useActionState(action, initialRosterActionState);
  return (
    <article className="operationalCard">
      <strong>{player.display_name}</strong>
      <p>
        {player.country_code ?? copy.noCountry} · Steam:{" "}
        {player.steam_id ?? "—"} · Deadlock: {player.deadlock_account_id ?? "—"}
      </p>
      <form action={formAction}>
        <input type="hidden" name="tournament_team_id" value={teamId} />
        <input type="hidden" name="player_id" value={player.id} />
        <div className="operationalFormGrid">
          <RoleFields />
        </div>
        <Notice state={state} />
        <Submit pending={copy.addingPlayer}>{copy.useExisting}</Submit>
      </form>
    </article>
  );
}

function ActiveMember({
  member,
  actions,
}: {
  member: SafeRosterMember;
  actions: RosterActions;
}) {
  const copy = useOperationalCopy();
  const [profileState, profileAction] = useActionState(
    actions.updatePlayer,
    initialRosterActionState,
  );
  const [memberState, memberAction] = useActionState(
    actions.updateMembership,
    initialRosterActionState,
  );
  const [removeState, removeAction] = useActionState(
    actions.remove,
    initialRosterActionState,
  );
  return (
    <article className="operationalCard">
      <div className="operationalCardHeader">
        <div>
          <strong>
            {member.player.display_name}
            {member.is_captain ? ` · ${copy.captain}` : ""}
          </strong>
          <p>
            {copy[member.role]} · {member.player.country_code ?? copy.noCountry}
          </p>
        </div>
      </div>
      <dl className="operationalFacts">
        <div>
          <dt>{copy.steamId}</dt>
          <dd>{member.player.steam_id ?? copy.notSet}</dd>
        </div>
        <div>
          <dt>{copy.deadlockId}</dt>
          <dd>{member.player.deadlock_account_id ?? copy.notSet}</dd>
        </div>
      </dl>
      <details className="operationalEditor">
        <summary>{copy.editProfile}</summary>
        <p className="adminWarning">{copy.sharedProfileWarning}</p>
        <form action={profileAction}>
          <input type="hidden" name="player_id" value={member.player.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={member.player.updated_at}
          />
          <PlayerFields member={member} />
          <Notice state={profileState} />
          <Submit pending={copy.savingProfile}>{copy.saveProfile}</Submit>
        </form>
      </details>
      <details className="operationalEditor">
        <summary>{copy.editMembership}</summary>
        <form action={memberAction}>
          <input type="hidden" name="membership_id" value={member.id} />
          <input
            type="hidden"
            name="tournament_team_id"
            value={member.tournament_team_id}
          />
          <input
            type="hidden"
            name="expected_updated_at"
            value={member.updated_at}
          />
          <div className="operationalFormGrid">
            <RoleFields defaultRole={member.role} captain={member.is_captain} />
          </div>
          <Notice state={memberState} />
          <Submit pending={copy.savingMembership}>{copy.saveMembership}</Submit>
        </form>
      </details>
      <div className="deleteConfirmation">
        <ConfirmationDialog
          trigger={copy.removeRoster}
          title={copy.removeRoster}
          description={copy.removeQuestion(member.player.display_name)}
          cancelLabel={copy.cancel}
        >
          <form action={removeAction}>
            <input type="hidden" name="membership_id" value={member.id} />
            <input
              type="hidden"
              name="tournament_team_id"
              value={member.tournament_team_id}
            />
            <input
              type="hidden"
              name="expected_updated_at"
              value={member.updated_at}
            />
            <Notice state={removeState} />
            <Submit pending={copy.removing}>{copy.removeRoster}</Submit>
          </form>
        </ConfirmationDialog>
      </div>
    </article>
  );
}

function InactiveMember({
  member,
  action,
}: {
  member: SafeRosterMember;
  action: RosterServerAction;
}) {
  const copy = useOperationalCopy();
  const locale = useOperationalLocale();
  const [state, formAction] = useActionState(action, initialRosterActionState);
  return (
    <article className="operationalCard">
      <strong>{member.player.display_name}</strong>
      <p>
        {locale === "ru" ? "Предыдущая роль" : "Previously"}:{" "}
        {copy[member.role]}
      </p>
      <form action={formAction}>
        <input type="hidden" name="membership_id" value={member.id} />
        <input
          type="hidden"
          name="tournament_team_id"
          value={member.tournament_team_id}
        />
        <input
          type="hidden"
          name="expected_updated_at"
          value={member.updated_at}
        />
        <label>
          {copy.role}
          <select name="role" defaultValue={member.role}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {copy[role]}
              </option>
            ))}
          </select>
        </label>
        <Notice state={state} />
        <Submit pending={copy.restoring}>{copy.restore}</Submit>
      </form>
    </article>
  );
}

export function RosterWorkspace({
  teams,
  members,
  actions,
  locale = "en",
}: {
  teams: AdminTournamentTeam[];
  members: SafeRosterMember[];
  actions: RosterActions;
  locale?: Locale;
}) {
  return (
    <OperationalI18nProvider locale={locale}>
      <RosterWorkspaceContent
        teams={teams}
        members={members}
        actions={actions}
      />
    </OperationalI18nProvider>
  );
}

function RosterWorkspaceContent({
  teams,
  members,
  actions,
}: {
  teams: AdminTournamentTeam[];
  members: SafeRosterMember[];
  actions: RosterActions;
}) {
  const copy = useOperationalCopy();
  const activeCount = members.filter((member) => member.is_active).length;
  const inactiveCount = members.length - activeCount;
  return (
    <section className="adminPanel" aria-labelledby="workspace-rosters">
      <div className="adminPanelHeading">
        <div>
          <h2 id="workspace-rosters">{copy.rostersTitle}</h2>
          <p className="supportingText">{copy.rostersHelp}</p>
        </div>
      </div>
      <dl className="operationalSummary" aria-label="Roster summary">
        <div>
          <dt>{copy.activeMembers}</dt>
          <dd>{activeCount}</dd>
        </div>
        <div>
          <dt>{copy.formerMembers}</dt>
          <dd>{inactiveCount}</dd>
        </div>
        <div>
          <dt>{copy.uniquePlayers}</dt>
          <dd>{new Set(members.map((member) => member.player_id)).size}</dd>
        </div>
      </dl>
      {teams.length === 0 ? (
        <EmptyState
          title={copy.teamsEmptyTitle}
          description={copy.noTeamsForRoster}
        />
      ) : (
        teams.map((team) => {
          const roster = members.filter(
            (member) => member.tournament_team_id === team.id,
          );
          const active = roster.filter((member) => member.is_active);
          const inactive = roster.filter((member) => !member.is_active);
          return (
            <section
              className="rosterTeam"
              key={team.id}
              aria-labelledby={`roster-${team.id}`}
            >
              <h3 id={`roster-${team.id}`}>{team.name}</h3>
              <div className="inlineActions">
                <CreatePlayer teamId={team.id} action={actions.createPlayer} />
                <SearchAndAdd
                  teamId={team.id}
                  search={actions.search}
                  add={actions.addExisting}
                />
              </div>
              {active.length ? (
                roles.map((role) => {
                  const roleMembers = active.filter(
                    (member) => member.role === role,
                  );
                  return roleMembers.length ? (
                    <section key={role} className="rosterRoleGroup">
                      <h4>{copy[role]}</h4>
                      <div className="operationalCards">
                        {roleMembers.map((member) => (
                          <ActiveMember
                            key={member.id}
                            member={member}
                            actions={actions}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null;
                })
              ) : (
                <EmptyState
                  title={copy.noRosterTitle}
                  description={copy.noRoster}
                />
              )}
              {inactive.length ? (
                <details className="operationalEditor">
                  <summary>
                    {copy.formerMembers} ({inactive.length})
                  </summary>
                  <div className="operationalCards">
                    {inactive.map((member) => (
                      <InactiveMember
                        key={member.id}
                        member={member}
                        action={actions.restore}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </section>
          );
        })
      )}
    </section>
  );
}
