"use client";

import { useActionState } from "react";

import type { Locale } from "@/i18n/config";

import {
  initialStructureActionState,
  type StructureActionState,
} from "@/lib/operational-workspace/bracket-standings-state";

type Action = (
  state: StructureActionState,
  formData: FormData,
) => Promise<StructureActionState>;
type Team = { id: string; name: string; seed?: number | null };
type Match = {
  id: string;
  match_number: number | null;
  round_name: string | null;
  bracket_section?: string | null;
  bracket_round?: number | null;
  bracket_position?: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  status: string;
  updated_at: string;
};
type Link = {
  id: string;
  source_match_id: string;
  outcome: string;
  target_match_id: string;
  target_slot: string;
  updated_at: string;
};

const structureCopy = {
  en: {
    bracket: "bracket",
    intro:
      "Assign matches to rounds and connect winner/loser outcomes to downstream slots. Reopening a completed source match does not silently clear downstream teams.",
    ready: "Validation: all matches have bracket positions.",
    incomplete:
      "Validation: assign a section, round and position to every match.",
    section: "Bracket section",
    type: "Bracket type",
    round: "Round",
    position: "Position",
    savePosition: "Save position",
    single: "Single elimination",
    double: "Double elimination",
    main: "Main",
    winners: "Winners",
    losers: "Losers",
    grandFinal: "Grand final",
    thirdPlace: "Third place",
    unassigned: "unassigned",
    advancement: "Advancement links",
    sourceMatch: "Source match",
    outcome: "Outcome",
    winner: "Winner",
    loser: "Loser",
    targetMatch: "Target match",
    targetSlot: "Target slot",
    teamA: "Team A",
    teamB: "Team B",
    addLink: "Add link",
    remove: "Remove",
    standings: "standings",
    config: "Calculation rules",
    tieWarning:
      "MVP tie-break: points, wins, score difference, score for, seed, then team name. Head-to-head is not calculated.",
    enabled: "Enabled",
    winPoints: "Points for win",
    lossPoints: "Points for loss",
    walkoverPoints: "Points for walkover",
    scoreTie: "Use score difference tie-break",
    qualify: "Qualify top",
    mode: "Calculation mode",
    automatic: "Automatic",
    adjusted: "Automatic + adjustments",
    saveConfig: "Save configuration",
    groups: "Groups and zero-match teams",
    team: "Team",
    group: "Group",
    order: "Order",
    assign: "Assign",
    adjustments: "Manual adjustments",
    pointsAdjustment: "Points adjustment",
    rankOverride: "Rank override",
    qualifiedOverride: "Qualified override",
    qualified: "Qualified",
    notQualified: "Not qualified",
    publicNote: "Public note",
    saveAdjustment: "Save adjustment",
    calculated: "Calculated standings",
    played: "Played",
    winsShort: "W",
    lossesShort: "L",
    scoreFor: "For",
    scoreAgainst: "Against",
    difference: "Diff",
    points: "Pts",
    note: "Note",
    saved: "Saved.",
    invalid: "Check the entered values.",
    tbd: "TBD",
  },
  ru: {
    bracket: "сетка",
    intro:
      "Назначьте матчам раунды и свяжите победителя или проигравшего со слотами следующих матчей. Повторное открытие результата не удаляет команды из следующих матчей автоматически.",
    ready: "Проверка: всем матчам назначены позиции в сетке.",
    incomplete: "Проверка: назначьте каждому матчу секцию, раунд и позицию.",
    section: "Секция сетки",
    type: "Тип сетки",
    round: "Раунд",
    position: "Позиция",
    savePosition: "Сохранить позицию",
    single: "Одиночное выбывание",
    double: "Двойное выбывание",
    main: "Основная",
    winners: "Верхняя",
    losers: "Нижняя",
    grandFinal: "Гранд-финал",
    thirdPlace: "За третье место",
    unassigned: "не назначено",
    advancement: "Связи продвижения",
    sourceMatch: "Исходный матч",
    outcome: "Исход",
    winner: "Победитель",
    loser: "Проигравший",
    targetMatch: "Следующий матч",
    targetSlot: "Слот",
    teamA: "Команда A",
    teamB: "Команда B",
    addLink: "Добавить связь",
    remove: "Удалить",
    standings: "таблица",
    config: "Правила расчёта",
    tieWarning:
      "Правило MVP при равенстве: очки, победы, разница счёта, набранный счёт, посев, затем название команды. Личные встречи не рассчитываются.",
    enabled: "Включено",
    winPoints: "Очки за победу",
    lossPoints: "Очки за поражение",
    walkoverPoints: "Очки за техническую победу",
    scoreTie: "Учитывать разницу счёта",
    qualify: "Проходят мест",
    mode: "Режим расчёта",
    automatic: "Автоматически",
    adjusted: "Автоматически + корректировки",
    saveConfig: "Сохранить настройки",
    groups: "Группы и команды без матчей",
    team: "Команда",
    group: "Группа",
    order: "Порядок",
    assign: "Назначить",
    adjustments: "Ручные корректировки",
    pointsAdjustment: "Корректировка очков",
    rankOverride: "Переопределить место",
    qualifiedOverride: "Переопределить квалификацию",
    qualified: "Проходит",
    notQualified: "Не проходит",
    publicNote: "Публичное примечание",
    saveAdjustment: "Сохранить корректировку",
    calculated: "Рассчитанная таблица",
    played: "Игр",
    winsShort: "П",
    lossesShort: "Пор",
    scoreFor: "За",
    scoreAgainst: "Против",
    difference: "Разн.",
    points: "Очки",
    note: "Примечание",
    saved: "Сохранено.",
    invalid: "Проверьте введённые значения.",
    tbd: "Уточняется",
  },
} as const;

const errorCopy: Record<Locale, Record<string, string>> = {
  en: {
    BRACKET_STAGE_UNSUPPORTED: "This stage does not support a bracket.",
    BRACKET_MATCH_OUTSIDE_STAGE: "Both matches must belong to this stage.",
    BRACKET_LINK_CYCLE: "This link would create a cycle.",
    BRACKET_TARGET_SLOT_OCCUPIED: "The target slot is already occupied.",
    BRACKET_OUTCOME_ALREADY_LINKED: "This outcome already has a destination.",
    BRACKET_INVALID_ROUND_DIRECTION: "A link must advance to a later round.",
    BRACKET_ADVANCEMENT_CONFLICT:
      "The result was saved, but a downstream slot needs manual correction.",
    STANDINGS_STAGE_UNSUPPORTED: "This stage does not support standings.",
    STANDINGS_TEAM_OUTSIDE_TOURNAMENT:
      "The selected team is outside this tournament.",
    STANDINGS_GROUP_DUPLICATE: "Remove the existing group assignment first.",
    STANDINGS_INVALID_CONFIG: "The standings configuration is invalid.",
    STANDINGS_STALE_UPDATE:
      "Standings changed in another session. Reload and try again.",
  },
  ru: {
    BRACKET_STAGE_UNSUPPORTED: "Этот этап не поддерживает сетку.",
    BRACKET_MATCH_OUTSIDE_STAGE: "Оба матча должны принадлежать этому этапу.",
    BRACKET_LINK_CYCLE: "Эта связь создаст цикл.",
    BRACKET_TARGET_SLOT_OCCUPIED: "Целевой слот уже занят.",
    BRACKET_OUTCOME_ALREADY_LINKED: "Для этого исхода уже задан переход.",
    BRACKET_INVALID_ROUND_DIRECTION:
      "Связь должна вести в более поздний раунд.",
    BRACKET_ADVANCEMENT_CONFLICT:
      "Результат сохранён, но следующий слот требует ручной проверки.",
    STANDINGS_STAGE_UNSUPPORTED: "Этот этап не поддерживает таблицу.",
    STANDINGS_TEAM_OUTSIDE_TOURNAMENT: "Команда не принадлежит этому турниру.",
    STANDINGS_GROUP_DUPLICATE: "Сначала удалите текущее назначение группы.",
    STANDINGS_INVALID_CONFIG: "Настройки таблицы некорректны.",
    STANDINGS_STALE_UPDATE:
      "Таблица изменилась в другой сессии. Обновите страницу.",
  },
};

function Feedback({
  state,
  locale,
}: {
  state: StructureActionState;
  locale: Locale;
}) {
  return state.status === "idle" ? null : (
    <p
      className={state.status === "error" ? "formError" : "formSuccess"}
      role="status"
    >
      {state.status === "success"
        ? structureCopy[locale].saved
        : (errorCopy[locale][state.message] ?? structureCopy[locale].invalid)}
    </p>
  );
}

function BracketCard({
  match,
  teams,
  action,
  bracketType,
  locale,
}: {
  match: Match;
  teams: Team[];
  action: Action;
  bracketType: string;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialStructureActionState,
  );
  const c = structureCopy[locale];
  const name = (id: string | null) =>
    teams.find((team) => team.id === id)?.name ?? c.tbd;
  return (
    <article className="bracketMatchCard">
      <header>
        <strong>
          {match.round_name ?? `Match ${match.match_number ?? "–"}`}
        </strong>
        <span>{match.status}</span>
      </header>
      <p>
        {name(match.team_a_id)} <b>{match.score_a ?? "–"}</b>
      </p>
      <p>
        {name(match.team_b_id)} <b>{match.score_b ?? "–"}</b>
      </p>
      <form action={formAction} className="bracketPositionForm">
        <input type="hidden" name="match_id" value={match.id} />
        <input
          type="hidden"
          name="expected_updated_at"
          value={match.updated_at}
        />
        <select
          name="bracket_type"
          aria-label={c.type}
          defaultValue={bracketType}
        >
          <option value="single_elimination">{c.single}</option>
          <option value="double_elimination">{c.double}</option>
        </select>
        <select
          name="section"
          aria-label={c.section}
          defaultValue={match.bracket_section ?? "main"}
        >
          <option value="main">{c.main}</option>
          <option value="winners">{c.winners}</option>
          <option value="losers">{c.losers}</option>
          <option value="grand_final">{c.grandFinal}</option>
          <option value="third_place">{c.thirdPlace}</option>
        </select>
        <input
          name="round"
          aria-label={c.round}
          type="number"
          min="1"
          defaultValue={match.bracket_round ?? 1}
        />
        <input
          name="position"
          aria-label={c.position}
          type="number"
          min="1"
          defaultValue={match.bracket_position ?? match.match_number ?? 1}
        />
        <button type="submit" disabled={pending}>
          {c.savePosition}
        </button>
      </form>
      <Feedback state={state} locale={locale} />
    </article>
  );
}

export function BracketWorkspace({
  stage,
  matches,
  links,
  teams,
  positionAction,
  linkAction,
  unlinkAction,
  locale,
}: {
  stage: {
    id: string;
    name: string;
    stage_type: string;
    bracket_type?: string | null;
  };
  matches: Match[];
  links: Link[];
  teams: Team[];
  positionAction: Action;
  linkAction: Action;
  unlinkAction: Action;
  locale: Locale;
}) {
  const [linkState, createLink, linkPending] = useActionState(
    linkAction,
    initialStructureActionState,
  );
  const bracketType =
    stage.bracket_type ??
    (stage.stage_type === "double_elimination"
      ? "double_elimination"
      : "single_elimination");
  const c = structureCopy[locale];
  const sectionOrder: Record<string, number> = {
    main: 0,
    winners: 0,
    losers: 1,
    third_place: 2,
    grand_final: 3,
    unassigned: 4,
  };
  const orderedMatches = [...matches].sort(
    (a, b) =>
      (sectionOrder[a.bracket_section ?? "unassigned"] ?? 99) -
        (sectionOrder[b.bracket_section ?? "unassigned"] ?? 99) ||
      (a.bracket_round ?? Number.MAX_SAFE_INTEGER) -
        (b.bracket_round ?? Number.MAX_SAFE_INTEGER) ||
      (a.bracket_position ?? Number.MAX_SAFE_INTEGER) -
        (b.bracket_position ?? Number.MAX_SAFE_INTEGER) ||
      (a.match_number ?? Number.MAX_SAFE_INTEGER) -
        (b.match_number ?? Number.MAX_SAFE_INTEGER),
  );
  const columns = [
    ...new Set(
      orderedMatches.map(
        (match) =>
          `${match.bracket_section ?? "unassigned"}:${match.bracket_round ?? 0}`,
      ),
    ),
  ];
  return (
    <div className="structureWorkspace">
      <section className="adminPanel">
        <h1>
          {stage.name} {c.bracket}
        </h1>
        <p>{c.intro}</p>
        <p className="adminWarning" role="status">
          {matches.every(
            (match) =>
              match.bracket_section &&
              match.bracket_round &&
              match.bracket_position,
          )
            ? c.ready
            : c.incomplete}
        </p>
        <div
          className="bracketBoard"
          role="region"
          aria-label={`${stage.name} ${c.bracket}`}
          tabIndex={0}
        >
          {columns.map((key) => {
            const [section, round] = key.split(":");
            return (
              <section className="bracketRound" key={key}>
                <h2>
                  {section} · {c.round} {round === "0" ? c.unassigned : round}
                </h2>
                {orderedMatches
                  .filter(
                    (match) =>
                      `${match.bracket_section ?? "unassigned"}:${match.bracket_round ?? 0}` ===
                      key,
                  )
                  .sort(
                    (a, b) =>
                      (a.bracket_position ?? 999) - (b.bracket_position ?? 999),
                  )
                  .map((match) => (
                    <BracketCard
                      key={match.id}
                      match={match}
                      teams={teams}
                      action={positionAction}
                      bracketType={bracketType}
                      locale={locale}
                    />
                  ))}
              </section>
            );
          })}
        </div>
      </section>
      <section className="adminPanel">
        <h2>{c.advancement}</h2>
        <form action={createLink} className="structureForm">
          <input type="hidden" name="stage_id" value={stage.id} />
          <label>
            {c.sourceMatch}
            <select name="source_match_id">
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  Match {match.match_number ?? match.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.outcome}
            <select name="outcome">
              <option value="winner">{c.winner}</option>
              {bracketType === "double_elimination" ? (
                <option value="loser">{c.loser}</option>
              ) : null}
            </select>
          </label>
          <label>
            {c.targetMatch}
            <select name="target_match_id">
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  Match {match.match_number ?? match.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.targetSlot}
            <select name="target_slot">
              <option value="team_a">{c.teamA}</option>
              <option value="team_b">{c.teamB}</option>
            </select>
          </label>
          <button type="submit" disabled={linkPending}>
            {c.addLink}
          </button>
        </form>
        <Feedback state={linkState} locale={locale} />
        <ul className="structureList">
          {links.map((link) => (
            <BracketLinkItem
              key={link.id}
              link={link}
              matches={matches}
              action={unlinkAction}
              locale={locale}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function BracketLinkItem({
  link,
  matches,
  action,
  locale,
}: {
  link: Link;
  matches: Match[];
  action: Action;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialStructureActionState,
  );
  const label = (id: string) =>
    `Match ${matches.find((match) => match.id === id)?.match_number ?? id.slice(0, 8)}`;
  return (
    <li>
      {label(link.source_match_id)} {link.outcome} →{" "}
      {label(link.target_match_id)} {link.target_slot}
      <form action={formAction}>
        <input type="hidden" name="id" value={link.id} />
        <input
          type="hidden"
          name="expected_updated_at"
          value={link.updated_at}
        />
        <button type="submit" disabled={pending}>
          {structureCopy[locale].remove}
        </button>
      </form>
      <Feedback state={state} locale={locale} />
    </li>
  );
}

export function StandingsWorkspace({
  stage,
  config,
  groups,
  adjustments,
  standings,
  teams,
  configAction,
  groupAction,
  removeGroupAction,
  adjustmentAction,
  deleteAdjustmentAction,
  locale,
}: {
  stage: { id: string; name: string };
  config: {
    enabled: boolean;
    points_for_win: number;
    points_for_loss: number;
    points_for_walkover: number;
    score_difference_enabled: boolean;
    qualification_places: number | null;
    calculation_mode: string;
    updated_at: string;
  } | null;
  groups: Array<{
    id: string;
    team_id: string;
    group_name: string;
    sequence_number: number;
    updated_at: string;
    team?: Team;
  }>;
  adjustments: Array<{
    id: string;
    team_id: string;
    points_adjustment: number;
    rank_override: number | null;
    qualified_override: boolean | null;
    public_note: string | null;
    updated_at: string;
    team?: Team;
  }>;
  standings: Array<Record<string, unknown>>;
  teams: Team[];
  configAction: Action;
  groupAction: Action;
  removeGroupAction: Action;
  adjustmentAction: Action;
  deleteAdjustmentAction: Action;
  locale: Locale;
}) {
  const [configState, saveConfig, configPending] = useActionState(
    configAction,
    initialStructureActionState,
  );
  const [groupState, saveGroup, groupPending] = useActionState(
    groupAction,
    initialStructureActionState,
  );
  const [adjustState, saveAdjustment, adjustPending] = useActionState(
    adjustmentAction,
    initialStructureActionState,
  );
  const c = structureCopy[locale];
  return (
    <div className="structureWorkspace">
      <section className="adminPanel">
        <h1>
          {stage.name} {c.standings}
        </h1>
        <h2>{c.config}</h2>
        <p className="adminWarning">{c.tieWarning}</p>
        <form action={saveConfig} className="structureForm">
          <input type="hidden" name="stage_id" value={stage.id} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={config?.updated_at ?? ""}
          />
          <label>
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={config?.enabled ?? true}
            />{" "}
            {c.enabled}
          </label>
          <label>
            {c.winPoints}
            <input
              type="number"
              name="points_for_win"
              defaultValue={config?.points_for_win ?? 3}
            />
          </label>
          <label>
            {c.lossPoints}
            <input
              type="number"
              name="points_for_loss"
              defaultValue={config?.points_for_loss ?? 0}
            />
          </label>
          <label>
            {c.walkoverPoints}
            <input
              type="number"
              name="points_for_walkover"
              defaultValue={config?.points_for_walkover ?? 3}
            />
          </label>
          <label>
            <input
              type="checkbox"
              name="score_difference_enabled"
              defaultChecked={config?.score_difference_enabled ?? true}
            />{" "}
            {c.scoreTie}
          </label>
          <label>
            {c.qualify}
            <input
              type="number"
              min="1"
              name="qualification_places"
              defaultValue={config?.qualification_places ?? ""}
            />
          </label>
          <label>
            {c.mode}
            <select
              name="calculation_mode"
              defaultValue={config?.calculation_mode ?? "automatic"}
            >
              <option value="automatic">{c.automatic}</option>
              <option value="manual_adjustment">{c.adjusted}</option>
            </select>
          </label>
          <button disabled={configPending}>{c.saveConfig}</button>
        </form>
        <Feedback state={configState} locale={locale} />
      </section>
      <section className="adminPanel">
        <h2>{c.groups}</h2>
        <form action={saveGroup} className="structureForm">
          <input type="hidden" name="stage_id" value={stage.id} />
          <label>
            {c.team}
            <select name="team_id">
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.group}
            <input name="group_name" defaultValue="A" />
          </label>
          <label>
            {c.order}
            <input
              type="number"
              min="1"
              name="sequence_number"
              defaultValue="1"
            />
          </label>
          <button disabled={groupPending}>{c.assign}</button>
        </form>
        <Feedback state={groupState} locale={locale} />
        <div className="structureList">
          {groups.map((group) => (
            <DeleteRow
              key={group.id}
              row={group}
              label={`${group.team?.name ?? group.team_id} · ${group.group_name}`}
              action={removeGroupAction}
              locale={locale}
            />
          ))}
        </div>
      </section>
      <section className="adminPanel">
        <h2>{c.adjustments}</h2>
        <form action={saveAdjustment} className="structureForm">
          <input type="hidden" name="stage_id" value={stage.id} />
          <label>
            {c.team}
            <select name="team_id">
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.pointsAdjustment}
            <input type="number" name="points_adjustment" defaultValue="0" />
          </label>
          <label>
            {c.rankOverride}
            <input type="number" min="1" name="rank_override" />
          </label>
          <label>
            {c.qualifiedOverride}
            <select name="qualified_override" defaultValue="">
              <option value="">{c.automatic}</option>
              <option value="true">{c.qualified}</option>
              <option value="false">{c.notQualified}</option>
            </select>
          </label>
          <label>
            {c.publicNote}
            <input name="public_note" maxLength={500} />
          </label>
          <button disabled={adjustPending}>{c.saveAdjustment}</button>
        </form>
        <Feedback state={adjustState} locale={locale} />
        <div className="structureList">
          {adjustments.map((item) => (
            <div key={item.id}>
              <form action={saveAdjustment} className="structureForm">
                <strong>{item.team?.name ?? item.team_id}</strong>
                <input type="hidden" name="stage_id" value={stage.id} />
                <input type="hidden" name="team_id" value={item.team_id} />
                <input
                  type="hidden"
                  name="expected_updated_at"
                  value={item.updated_at}
                />
                <label>
                  {c.pointsAdjustment}
                  <input
                    type="number"
                    name="points_adjustment"
                    defaultValue={item.points_adjustment}
                  />
                </label>
                <label>
                  {c.rankOverride}
                  <input
                    type="number"
                    min="1"
                    name="rank_override"
                    defaultValue={item.rank_override ?? ""}
                  />
                </label>
                <label>
                  {c.qualifiedOverride}
                  <select
                    name="qualified_override"
                    defaultValue={
                      item.qualified_override === null
                        ? ""
                        : String(item.qualified_override)
                    }
                  >
                    <option value="">{c.automatic}</option>
                    <option value="true">{c.qualified}</option>
                    <option value="false">{c.notQualified}</option>
                  </select>
                </label>
                <label>
                  {c.publicNote}
                  <input
                    name="public_note"
                    maxLength={500}
                    defaultValue={item.public_note ?? ""}
                  />
                </label>
                <button disabled={adjustPending}>{c.saveAdjustment}</button>
              </form>
              <DeleteRow
                row={item}
                label=""
                action={deleteAdjustmentAction}
                locale={locale}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="adminPanel">
        <h2>{c.calculated}</h2>
        <div className="standingsTableWrap">
          <table className="standingsTable">
            <caption>
              {stage.name} {c.standings}
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">{c.team}</th>
                <th scope="col">{c.played}</th>
                <th scope="col">{c.winsShort}</th>
                <th scope="col">{c.lossesShort}</th>
                <th scope="col">{c.scoreFor}</th>
                <th scope="col">{c.scoreAgainst}</th>
                <th scope="col">{c.difference}</th>
                <th scope="col">{c.points}</th>
                <th scope="col">{c.qualified}</th>
                <th scope="col">{c.note}</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={String(row.team_id)}>
                  <td>{String(row.rank)}</td>
                  <th scope="row">{String(row.team_name)}</th>
                  <td>{String(row.played)}</td>
                  <td>{String(row.wins)}</td>
                  <td>{String(row.losses)}</td>
                  <td>{String(row.score_for)}</td>
                  <td>{String(row.score_against)}</td>
                  <td>{String(row.score_diff)}</td>
                  <td>{String(row.points)}</td>
                  <td>{row.qualified ? "✓" : ""}</td>
                  <td>{String(row.public_note ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DeleteRow({
  row,
  label,
  action,
  locale,
}: {
  row: { id: string; updated_at: string };
  label: string;
  action: Action;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialStructureActionState,
  );
  return (
    <div>
      {label}
      <form action={formAction}>
        <input type="hidden" name="id" value={row.id} />
        <input
          type="hidden"
          name="expected_updated_at"
          value={row.updated_at}
        />
        <button disabled={pending}>{structureCopy[locale].remove}</button>
      </form>
      <Feedback state={state} locale={locale} />
    </div>
  );
}
