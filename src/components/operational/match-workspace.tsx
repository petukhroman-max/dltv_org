"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { getMatchCopy } from "@/components/operational/match-i18n";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";
import { formatDateTime } from "@/i18n/format";
import {
  type OrganizerTournamentMatch,
  type TournamentMatchStatus,
} from "@/lib/domain/tournament-match";
import {
  initialMatchActionState,
  type MatchServerAction,
} from "@/lib/operational-workspace/match-action-state";
import type { TournamentStageRow } from "@/lib/domain/tournament-stage";
import type { TournamentTeamRow } from "@/lib/domain/tournament-team";

export type MatchActions = {
  create: MatchServerAction;
  update: MatchServerAction;
  schedule: MatchServerAction;
  start: MatchServerAction;
  postpone: MatchServerAction;
  complete: MatchServerAction;
  walkover: MatchServerAction;
  cancel: MatchServerAction;
  reopen: MatchServerAction;
  remove: MatchServerAction;
};

function SubmitButton({
  children,
  pendingLabel,
  className = "secondaryButton",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      name={name}
      value={value}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

function Feedback({ state }: { state: typeof initialMatchActionState }) {
  if (!state.message && Object.keys(state.fieldErrors).length === 0)
    return null;
  return (
    <div
      className={state.status === "success" ? "adminNotice" : "formError"}
      role={state.status === "success" ? "status" : "alert"}
    >
      {state.message ? <p>{state.message}</p> : null}
      {Object.values(state.fieldErrors).map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}

function MatchFields({
  stages,
  teams,
  locale,
  match,
  defaultTimezone,
  includeOperational = false,
}: {
  stages: TournamentStageRow[];
  teams: TournamentTeamRow[];
  locale: Locale;
  match?: OrganizerTournamentMatch;
  defaultTimezone: string;
  includeOperational?: boolean;
}) {
  const copy = getMatchCopy(locale);
  const dateParts = match?.scheduled_at
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: match.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date(match.scheduled_at))
    : [];
  const parts = Object.fromEntries(
    dateParts.map((part) => [part.type, part.value]),
  );
  const dateValue = parts.year
    ? `${parts.year}-${parts.month}-${parts.day}`
    : "";
  const timeValue = parts.hour ? `${parts.hour}:${parts.minute}` : "";
  return (
    <div className="matchFormGrid">
      <label>
        {copy.stage}
        <select
          name="stage_id"
          defaultValue={match?.stage_id ?? ""}
          onChange={(event) => {
            const selected = stages.find(
              (stage) => stage.id === event.currentTarget.value,
            );
            const timezoneInput =
              event.currentTarget.form?.elements.namedItem("timezone");
            if (
              selected?.timezone &&
              timezoneInput instanceof HTMLInputElement
            ) {
              timezoneInput.value = selected.timezone;
            }
          }}
        >
          <option value="">{copy.noStage}</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.sequence_number}. {stage.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {copy.matchNumber}
        <input
          name="match_number"
          type="number"
          min="1"
          defaultValue={match?.match_number ?? ""}
        />
      </label>
      <label>
        {copy.round}
        <input
          name="round_name"
          maxLength={200}
          defaultValue={match?.round_name ?? ""}
        />
      </label>
      <label>
        {copy.group}
        <input
          name="group_name"
          maxLength={200}
          defaultValue={match?.group_name ?? ""}
        />
      </label>
      <label>
        {copy.scheduledDate}
        <input name="scheduled_date" type="date" defaultValue={dateValue} />
      </label>
      <label>
        {copy.scheduledTime}
        <input name="scheduled_time" type="time" defaultValue={timeValue} />
      </label>
      <label>
        {copy.timezone}
        <input
          name="timezone"
          maxLength={100}
          defaultValue={match?.timezone ?? defaultTimezone}
          required
        />
      </label>
      <label>
        {copy.bestOf}
        <select name="best_of" defaultValue={match?.best_of ?? ""}>
          <option value="">—</option>
          {[1, 3, 5, 7].map((value) => (
            <option key={value} value={value}>
              BO{value}
            </option>
          ))}
        </select>
      </label>
      {(["team_a_id", "team_b_id"] as const).map((name, index) => (
        <label key={name}>
          {index === 0 ? copy.teamA : copy.teamB}
          <select name={name} defaultValue={match?.[name] ?? ""}>
            <option value="">{copy.tbd}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="matchFormWide">
        {copy.streamUrl}
        <input
          name="stream_url"
          type="url"
          maxLength={2000}
          defaultValue={match?.stream_url ?? ""}
        />
      </label>
      {includeOperational ? (
        <>
          <label className="matchFormWide">
            {copy.vodUrl}
            <input
              name="vod_url"
              type="url"
              maxLength={2000}
              defaultValue={match?.vod_url ?? ""}
            />
          </label>
          <label>
            {copy.deadlockMatchId}
            <input
              name="deadlock_match_id"
              maxLength={200}
              defaultValue={match?.deadlock_match_id ?? ""}
            />
          </label>
          <label>
            {copy.duration}
            <input
              name="duration_seconds"
              type="number"
              min="1"
              defaultValue={match?.duration_seconds ?? ""}
            />
          </label>
        </>
      ) : null}
      <label className="checkboxLabel matchFormWide">
        <input
          name="is_public"
          type="checkbox"
          defaultChecked={match?.is_public ?? true}
        />
        {copy.public}
      </label>
    </div>
  );
}

function MatchBadge({ status, locale }: { status: string; locale: Locale }) {
  const copy = getMatchCopy(locale);
  return (
    <span className="statusBadge" data-status={status}>
      {copy.statuses[status as TournamentMatchStatus] ?? status}
    </span>
  );
}

export function MatchCreateForm({
  stages,
  teams,
  locale,
  defaultTimezone,
  action,
}: {
  stages: TournamentStageRow[];
  teams: TournamentTeamRow[];
  locale: Locale;
  defaultTimezone: string;
  action: MatchServerAction;
}) {
  const copy = getMatchCopy(locale);
  const [state, formAction] = useActionState(action, initialMatchActionState);
  return (
    <details className="adminPanel matchCreatePanel">
      <summary>{copy.create}</summary>
      <form action={formAction} className="matchForm">
        <input type="hidden" name="locale" value={locale} />
        <MatchFields
          stages={stages}
          teams={teams}
          locale={locale}
          defaultTimezone={defaultTimezone}
        />
        <div className="formActions">
          <SubmitButton pendingLabel={copy.working} name="intent" value="draft">
            {copy.saveDraft}
          </SubmitButton>
          <SubmitButton
            pendingLabel={copy.working}
            className="primaryButton"
            name="intent"
            value="schedule"
          >
            {copy.scheduleMatch}
          </SubmitButton>
        </div>
        <Feedback state={state} />
      </form>
    </details>
  );
}

function matchGroup(match: OrganizerTournamentMatch) {
  if (match.status === "live") return "live";
  if (match.status === "completed") return "completed";
  if (match.status === "scheduled") return "upcoming";
  return "other";
}

function scheduledDateKey(match: OrganizerTournamentMatch) {
  if (!match.scheduled_at) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: match.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(match.scheduled_at));
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

export function MatchList({
  matches,
  locale,
  detailBasePath,
  view,
}: {
  matches: OrganizerTournamentMatch[];
  locale: Locale;
  detailBasePath: string;
  view: "list" | "schedule";
}) {
  const copy = getMatchCopy(locale);
  if (!matches.length)
    return (
      <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
    );
  const groups =
    view === "schedule"
      ? Object.entries(
          matches.reduce<Record<string, OrganizerTournamentMatch[]>>(
            (result, match) => {
              const heading = scheduledDateKey(match) ?? copy.noDate;
              (result[heading] ??= []).push(match);
              return result;
            },
            {},
          ),
        )
      : (["live", "upcoming", "completed", "other"] as const).map(
          (group) =>
            [
              copy[group],
              matches.filter((match) => matchGroup(match) === group),
            ] as const,
        );
  return (
    <div className="matchGroups">
      {groups.map(([heading, rows]) =>
        rows?.length ? (
          <section
            key={heading}
            className="matchGroup"
            aria-labelledby={`match-group-${heading}`}
          >
            <h2 id={`match-group-${heading}`}>
              {view === "schedule" && heading !== copy.noDate
                ? new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(new Date(`${heading}T00:00:00Z`))
                : heading}
            </h2>
            <div className="matchList">
              {rows.map((match) => (
                <article className="matchCard" key={match.id}>
                  <div className="matchCardMeta">
                    <span>
                      {[
                        match.stage?.name ?? copy.noStage,
                        match.round_name,
                        match.group_name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span>
                      {match.match_number ? `#${match.match_number}` : "—"}
                    </span>
                    <MatchBadge status={match.status} locale={locale} />
                  </div>
                  <p className="matchTeams">
                    <strong>{match.team_a?.name ?? copy.tbd}</strong>
                    <span>
                      {match.score_a == null || match.score_b == null
                        ? "vs"
                        : `${match.score_a} : ${match.score_b}`}
                    </span>
                    <strong>{match.team_b?.name ?? copy.tbd}</strong>
                  </p>
                  <p className="supportingText">
                    {match.scheduled_at
                      ? `${formatDateTime(match.scheduled_at, locale, match.timezone)} · ${match.timezone}`
                      : copy.noDate}
                    {match.best_of ? ` · BO${match.best_of}` : ""}
                  </p>
                  <div className="contextualActions">
                    <Link
                      className="secondaryButton"
                      href={`${detailBasePath}/${match.id}`}
                    >
                      {copy.open}
                    </Link>
                    {match.stream_url ? (
                      <a
                        href={match.stream_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {copy.externalStream}
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}

function VersionFields({
  match,
  locale,
}: {
  match: OrganizerTournamentMatch;
  locale: Locale;
}) {
  return (
    <>
      <input type="hidden" name="id" value={match.id} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={match.updated_at}
      />
      <input type="hidden" name="locale" value={locale} />
    </>
  );
}

function SimpleAction({
  action,
  match,
  locale,
  label,
  targetStatus,
}: {
  action: MatchServerAction;
  match: OrganizerTournamentMatch;
  locale: Locale;
  label: string;
  targetStatus?: string;
}) {
  const copy = getMatchCopy(locale);
  const [state, formAction] = useActionState(action, initialMatchActionState);
  return (
    <form action={formAction}>
      <VersionFields match={match} locale={locale} />
      {targetStatus ? (
        <input type="hidden" name="target_status" value={targetStatus} />
      ) : null}
      <SubmitButton pendingLabel={copy.working}>{label}</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}

export function MatchDetailPanel({
  match,
  stages,
  teams,
  locale,
  defaultTimezone,
  actions,
}: {
  match: OrganizerTournamentMatch;
  stages: TournamentStageRow[];
  teams: TournamentTeamRow[];
  locale: Locale;
  defaultTimezone: string;
  actions: MatchActions;
}) {
  const copy = getMatchCopy(locale);
  const [updateState, updateAction] = useActionState(
    actions.update,
    initialMatchActionState,
  );
  const [completeState, completeAction] = useActionState(
    actions.complete,
    initialMatchActionState,
  );
  const [walkoverState, walkoverAction] = useActionState(
    actions.walkover,
    initialMatchActionState,
  );
  const [cancelState, cancelAction] = useActionState(
    actions.cancel,
    initialMatchActionState,
  );
  const [deleteState, deleteAction] = useActionState(
    actions.remove,
    initialMatchActionState,
  );
  const deletable =
    match.status === "draft" ||
    (match.status === "scheduled" &&
      match.score_a == null &&
      match.score_b == null &&
      !match.winner_team_id &&
      !match.deadlock_match_id &&
      !match.vod_url);
  return (
    <div className="matchDetailStack">
      <section className="adminPanel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">{match.stage?.name ?? copy.noStage}</p>
            <h2>
              {copy.edit}
              {match.match_number ? ` #${match.match_number}` : ""}
            </h2>
          </div>
          <MatchBadge status={match.status} locale={locale} />
        </div>
        {match.stream_url || match.vod_url ? (
          <div className="contextualActions">
            {match.stream_url ? (
              <a
                href={match.stream_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.externalStream}
              </a>
            ) : null}
            {match.vod_url ? (
              <a href={match.vod_url} target="_blank" rel="noopener noreferrer">
                {copy.externalVod}
              </a>
            ) : null}
          </div>
        ) : null}
        <form action={updateAction} className="matchForm">
          <VersionFields match={match} locale={locale} />
          <MatchFields
            stages={stages}
            teams={teams}
            locale={locale}
            match={match}
            defaultTimezone={defaultTimezone}
            includeOperational
          />
          <SubmitButton pendingLabel={copy.working} className="primaryButton">
            {copy.save}
          </SubmitButton>
          <Feedback state={updateState} />
        </form>
      </section>

      <section className="adminPanel">
        <h2>{copy.status}</h2>
        <div className="formActions">
          {(["draft", "postponed"] as string[]).includes(match.status) ? (
            <SimpleAction
              action={actions.schedule}
              match={match}
              locale={locale}
              label={copy.scheduleMatch}
            />
          ) : null}
          {match.status === "scheduled" ? (
            <>
              <SimpleAction
                action={actions.start}
                match={match}
                locale={locale}
                label={copy.start}
              />
              <SimpleAction
                action={actions.postpone}
                match={match}
                locale={locale}
                label={copy.postpone}
              />
            </>
          ) : null}
          {(["completed", "cancelled", "walkover"] as string[]).includes(
            match.status,
          ) ? (
            <SimpleAction
              action={actions.reopen}
              match={match}
              locale={locale}
              label={copy.reopen}
              targetStatus={
                match.status === "completed"
                  ? "live"
                  : match.status === "walkover"
                    ? "scheduled"
                    : "draft"
              }
            />
          ) : null}
        </div>
      </section>

      {(["scheduled", "live"] as string[]).includes(match.status) &&
      match.team_a_id &&
      match.team_b_id ? (
        <section className="adminPanel matchResultGrid">
          <form action={completeAction} className="matchForm">
            <h2>{copy.complete}</h2>
            <p className="supportingText">
              {match.team_a?.name ?? copy.teamA} vs{" "}
              {match.team_b?.name ?? copy.teamB}
            </p>
            <VersionFields match={match} locale={locale} />
            <input type="hidden" name="team_a_id" value={match.team_a_id} />
            <input type="hidden" name="team_b_id" value={match.team_b_id} />
            <div className="matchFormGrid">
              <label>
                {copy.scoreA}
                <input name="score_a" type="number" min="0" required />
              </label>
              <label>
                {copy.scoreB}
                <input name="score_b" type="number" min="0" required />
              </label>
              <label>
                {copy.deadlockMatchId}
                <input
                  name="deadlock_match_id"
                  maxLength={200}
                  defaultValue={match.deadlock_match_id ?? ""}
                />
              </label>
              <label>
                {copy.duration}
                <input
                  name="duration_seconds"
                  type="number"
                  min="1"
                  defaultValue={match.duration_seconds ?? ""}
                />
              </label>
              <label className="matchFormWide">
                {copy.vodUrl}
                <input
                  name="vod_url"
                  type="url"
                  maxLength={2000}
                  defaultValue={match.vod_url ?? ""}
                />
              </label>
            </div>
            <SubmitButton pendingLabel={copy.working} className="primaryButton">
              {copy.complete}
            </SubmitButton>
            <Feedback state={completeState} />
          </form>
          <form action={walkoverAction} className="matchForm">
            <h2>{copy.walkover}</h2>
            <VersionFields match={match} locale={locale} />
            <input type="hidden" name="team_a_id" value={match.team_a_id} />
            <input type="hidden" name="team_b_id" value={match.team_b_id} />
            <label>
              {copy.winner}
              <select name="winner_team_id" required defaultValue="">
                <option value="" disabled>
                  {copy.winner}
                </option>
                <option value={match.team_a_id}>
                  {match.team_a?.name ?? copy.teamA}
                </option>
                <option value={match.team_b_id}>
                  {match.team_b?.name ?? copy.teamB}
                </option>
              </select>
            </label>
            <SubmitButton pendingLabel={copy.working}>
              {copy.walkover}
            </SubmitButton>
            <Feedback state={walkoverState} />
          </form>
        </section>
      ) : null}

      <section className="adminPanel dangerZone">
        <div className="formActions">
          {(["draft", "scheduled", "postponed", "live"] as string[]).includes(
            match.status,
          ) ? (
            <ConfirmationDialog
              trigger={copy.cancel}
              title={copy.cancelTitle}
              description={copy.cancelDescription}
              cancelLabel={locale === "ru" ? "Назад" : "Back"}
            >
              <form action={cancelAction}>
                <VersionFields match={match} locale={locale} />
                <SubmitButton
                  pendingLabel={copy.working}
                  className="dangerButton"
                >
                  {copy.cancel}
                </SubmitButton>
              </form>
            </ConfirmationDialog>
          ) : null}
          {deletable ? (
            <ConfirmationDialog
              trigger={copy.remove}
              title={copy.deleteTitle}
              description={copy.deleteDescription}
              cancelLabel={locale === "ru" ? "Назад" : "Back"}
            >
              <form action={deleteAction}>
                <VersionFields match={match} locale={locale} />
                <SubmitButton
                  pendingLabel={copy.working}
                  className="dangerButton"
                >
                  {copy.remove}
                </SubmitButton>
              </form>
            </ConfirmationDialog>
          ) : null}
        </div>
        <Feedback state={cancelState} />
        <Feedback state={deleteState} />
      </section>
    </div>
  );
}
