"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

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
  if (!state.message && !Object.keys(state.fieldErrors).length) return null;
  return (
    <div
      className={state.status === "success" ? "adminNotice" : "formError"}
      role={state.status === "success" ? "status" : "alert"}
    >
      {state.message ? <p>{state.message}</p> : null}
      {Object.entries(state.fieldErrors).map(([name, value]) => (
        <p key={name}>{value}</p>
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
  return (
    <>
      <label>
        Role
        <select name="role" defaultValue={defaultRole}>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <label className="checkboxRow">
        <input name="is_captain" type="checkbox" defaultChecked={captain} />{" "}
        Captain
      </label>
      <p className="supportingText">
        Assigning this player as captain will replace the current captain. Only
        the player role can be captain.
      </p>
    </>
  );
}

function PlayerFields({ member }: { member?: SafeRosterMember }) {
  return (
    <div className="operationalFormGrid">
      <label>
        Display name
        <input
          name="display_name"
          required
          maxLength={80}
          defaultValue={member?.player.display_name ?? ""}
        />
      </label>
      <label>
        Country code
        <input
          name="country_code"
          maxLength={2}
          placeholder="US"
          defaultValue={member?.player.country_code ?? ""}
        />
      </label>
      <label>
        Steam ID
        <input
          name="steam_id"
          maxLength={100}
          defaultValue={member?.player.steam_id ?? ""}
        />
      </label>
      <label>
        Deadlock account ID
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
  const [state, formAction] = useActionState(action, initialRosterActionState);
  return (
    <details className="operationalEditor">
      <summary>Create player and add to roster</summary>
      <form action={formAction}>
        <input type="hidden" name="tournament_team_id" value={teamId} />
        <PlayerFields />
        <div className="operationalFormGrid">
          <RoleFields />
          <label>
            Joined at (optional)
            <input name="joined_at" placeholder="2026-08-01T10:00:00+00:00" />
          </label>
        </div>
        <label className="checkboxRow">
          <input name="confirm_same_name" type="checkbox" /> Create a different
          player even if the same display name exists
        </label>
        <Notice state={state} />
        <Submit pending="Adding player…">Add player</Submit>
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
  const [searchState, searchAction] = useActionState(
    search,
    initialRosterSearchState,
  );
  return (
    <details className="operationalEditor">
      <summary>Find existing player</summary>
      <form action={searchAction} className="inlineForm">
        <label>
          Display name or platform ID
          <input
            name="query"
            minLength={2}
            maxLength={100}
            required
            defaultValue={searchState.values.query ?? ""}
          />
        </label>
        <Submit pending="Searching…">Search</Submit>
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
  const [state, formAction] = useActionState(action, initialRosterActionState);
  return (
    <article className="operationalCard">
      <strong>{player.display_name}</strong>
      <p>
        {player.country_code ?? "No country"} · Steam: {player.steam_id ?? "—"}{" "}
        · Deadlock: {player.deadlock_account_id ?? "—"}
      </p>
      <form action={formAction}>
        <input type="hidden" name="tournament_team_id" value={teamId} />
        <input type="hidden" name="player_id" value={player.id} />
        <div className="operationalFormGrid">
          <RoleFields />
        </div>
        <Notice state={state} />
        <Submit pending="Adding…">Use existing player</Submit>
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
            {member.is_captain ? " · Captain" : ""}
          </strong>
          <p>
            {member.role} · {member.player.country_code ?? "No country"}
          </p>
        </div>
      </div>
      <dl className="operationalFacts">
        <div>
          <dt>Steam ID</dt>
          <dd>{member.player.steam_id ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Deadlock ID</dt>
          <dd>{member.player.deadlock_account_id ?? "Not set"}</dd>
        </div>
      </dl>
      <details className="operationalEditor">
        <summary>Edit player profile</summary>
        <p className="adminWarning">
          This player profile may be used in other tournaments. Profile changes
          can affect those rosters.
        </p>
        <form action={profileAction}>
          <input type="hidden" name="player_id" value={member.player.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={member.player.updated_at}
          />
          <PlayerFields member={member} />
          <Notice state={profileState} />
          <Submit pending="Saving profile…">Save profile</Submit>
        </form>
      </details>
      <details className="operationalEditor">
        <summary>Edit membership</summary>
        <form action={memberAction}>
          <input type="hidden" name="membership_id" value={member.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={member.updated_at}
          />
          <div className="operationalFormGrid">
            <RoleFields defaultRole={member.role} captain={member.is_captain} />
          </div>
          <Notice state={memberState} />
          <Submit pending="Saving membership…">Save membership</Submit>
        </form>
      </details>
      <details className="deleteConfirmation">
        <summary>Remove from roster</summary>
        <p>The historical membership will be retained.</p>
        <form action={removeAction}>
          <input type="hidden" name="membership_id" value={member.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={member.updated_at}
          />
          <Notice state={removeState} />
          <Submit pending="Removing…">Remove from roster</Submit>
        </form>
      </details>
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
  const [state, formAction] = useActionState(action, initialRosterActionState);
  return (
    <article className="operationalCard">
      <strong>{member.player.display_name}</strong>
      <p>Previously {member.role}</p>
      <form action={formAction}>
        <input type="hidden" name="membership_id" value={member.id} />
        <input
          type="hidden"
          name="expected_updated_at"
          value={member.updated_at}
        />
        <label>
          Role
          <select name="role" defaultValue={member.role}>
            {roles.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
        <Notice state={state} />
        <Submit pending="Restoring…">Restore to roster</Submit>
      </form>
    </article>
  );
}

export function RosterWorkspace({
  teams,
  members,
  actions,
}: {
  teams: AdminTournamentTeam[];
  members: SafeRosterMember[];
  actions: RosterActions;
}) {
  const activeCount = members.filter((member) => member.is_active).length;
  const inactiveCount = members.length - activeCount;
  return (
    <section className="adminPanel" aria-labelledby="workspace-rosters">
      <div className="adminPanelHeading">
        <div>
          <h2 id="workspace-rosters">Rosters</h2>
          <p className="supportingText">
            Manage active players and retain historical memberships. Real names
            are never shown here.
          </p>
        </div>
      </div>
      <dl className="operationalSummary" aria-label="Roster summary">
        <div>
          <dt>Active members</dt>
          <dd>{activeCount}</dd>
        </div>
        <div>
          <dt>Former members</dt>
          <dd>{inactiveCount}</dd>
        </div>
        <div>
          <dt>Unique players</dt>
          <dd>{new Set(members.map((member) => member.player_id)).size}</dd>
        </div>
      </dl>
      {teams.length === 0 ? (
        <p className="adminEmpty">Add a team before managing rosters.</p>
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
                <div className="operationalCards">
                  {active.map((member) => (
                    <ActiveMember
                      key={member.id}
                      member={member}
                      actions={actions}
                    />
                  ))}
                </div>
              ) : (
                <p className="adminEmpty">No active roster members.</p>
              )}
              {inactive.length ? (
                <details className="operationalEditor">
                  <summary>Former roster members ({inactive.length})</summary>
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
