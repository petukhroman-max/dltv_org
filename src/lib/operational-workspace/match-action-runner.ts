import "server-only";

import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import type { OperationalAccessContext } from "@/lib/operational-workspace/access-context";
import type {
  MatchActionState,
  MatchOperation,
} from "@/lib/operational-workspace/match-action-state";
import {
  cancelTournamentMatch,
  completeTournamentMatch,
  createTournamentMatch,
  createWalkoverResult,
  deleteTournamentMatch,
  MatchApplicationError,
  MatchValidationError,
  postponeTournamentMatch,
  reopenTournamentMatch,
  startTournamentMatch,
  updateTournamentMatch,
  updateTournamentMatchStatus,
} from "@/lib/operational-workspace/match.service";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
function nullableText(formData: FormData, name: string) {
  const value = text(formData, name).trim();
  return value || null;
}
function nullableNumber(formData: FormData, name: string) {
  const value = text(formData, name).trim();
  return value ? Number(value) : null;
}
function locale(formData: FormData): Locale {
  const value = text(formData, "locale");
  return isLocale(value) ? value : "en";
}
function t(current: Locale, en: string, ru: string) {
  return current === "ru" ? ru : en;
}

function zonedLocalDateTimeToUtc(date: string, time: string, timeZone: string) {
  if (!date || !time) return null;
  const wallClock = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(wallClock.getTime())) return "invalid";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(wallClock);
    const value = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    const represented = Date.UTC(
      Number(value.year),
      Number(value.month) - 1,
      Number(value.day),
      Number(value.hour),
      Number(value.minute),
      Number(value.second),
    );
    return new Date(
      wallClock.getTime() - (represented - wallClock.getTime()),
    ).toISOString();
  } catch {
    return "invalid";
  }
}

function version(formData: FormData) {
  return {
    id: text(formData, "id"),
    expected_updated_at: text(formData, "expected_updated_at"),
  };
}

function editable(formData: FormData) {
  const timeZone = text(formData, "timezone") || "UTC";
  return {
    stage_id: nullableText(formData, "stage_id"),
    match_number: nullableNumber(formData, "match_number"),
    round_name: nullableText(formData, "round_name"),
    group_name: nullableText(formData, "group_name"),
    scheduled_at: zonedLocalDateTimeToUtc(
      text(formData, "scheduled_date"),
      text(formData, "scheduled_time"),
      timeZone,
    ),
    timezone: timeZone,
    best_of: nullableNumber(formData, "best_of"),
    team_a_id: nullableText(formData, "team_a_id"),
    team_b_id: nullableText(formData, "team_b_id"),
    stream_url: nullableText(formData, "stream_url"),
    vod_url: nullableText(formData, "vod_url"),
    deadlock_match_id: nullableText(formData, "deadlock_match_id"),
    duration_seconds: nullableNumber(formData, "duration_seconds"),
    is_public: formData.get("is_public") === "on",
  };
}

function preservedValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [key, String(value)]),
  );
}

function errorMessage(error: MatchApplicationError, current: Locale) {
  const messages = {
    MATCH_STALE_UPDATE: t(
      current,
      "This match was updated elsewhere. Refresh the page and try again.",
      "Матч был изменён в другом месте. Обновите страницу и повторите попытку.",
    ),
    MATCH_TRANSITION_INVALID: t(
      current,
      "This status change is not allowed for the current match state.",
      "Для текущего состояния матча такой переход статуса недоступен.",
    ),
    MATCH_DELETE_HAS_HISTORY: t(
      current,
      "This match cannot be deleted because it already contains operational history.",
      "Матч нельзя удалить, поскольку у него уже есть операционная история.",
    ),
    MATCH_NOT_FOUND: t(current, "Match not found.", "Матч не найден."),
    MATCH_NUMBER_CONFLICT: t(
      current,
      "A match already uses this number in the selected stage.",
      "В выбранном этапе уже есть матч с таким номером.",
    ),
    MATCH_DEADLOCK_ID_CONFLICT: t(
      current,
      "This Deadlock Match ID is already used in the tournament.",
      "Этот Deadlock Match ID уже используется в турнире.",
    ),
    MATCH_SCOPE_INVALID: t(
      current,
      "The selected stage, teams, or winner do not belong to this tournament.",
      "Выбранный этап, команды или победитель не принадлежат этому турниру.",
    ),
    MATCH_ACCESS_DENIED: t(
      current,
      "This workspace link is invalid or no longer available.",
      "Ссылка на кабинет недействительна или больше недоступна.",
    ),
    MATCH_MUTATION_FAILED: t(
      current,
      "We could not complete this action. Please try again.",
      "Не удалось выполнить действие. Повторите попытку.",
    ),
  } satisfies Record<typeof error.code, string>;
  return messages[error.code];
}

export async function runMatchMutation(
  operation: MatchOperation,
  submissionId: string,
  accessContext: OperationalAccessContext,
  formData: FormData,
): Promise<MatchActionState> {
  const currentLocale = locale(formData);
  const values = preservedValues(formData);
  try {
    const envelope = { submissionId, values: {} as object };
    if (operation === "create") {
      envelope.values = {
        ...editable(formData),
        status: text(formData, "intent") === "schedule" ? "scheduled" : "draft",
      };
      await createTournamentMatch(envelope, accessContext);
    } else if (operation === "update") {
      envelope.values = { ...editable(formData), ...version(formData) };
      await updateTournamentMatch(envelope, accessContext);
    } else if (operation === "complete") {
      envelope.values = {
        ...version(formData),
        team_a_id: text(formData, "team_a_id"),
        team_b_id: text(formData, "team_b_id"),
        score_a: Number(text(formData, "score_a")),
        score_b: Number(text(formData, "score_b")),
        deadlock_match_id: nullableText(formData, "deadlock_match_id"),
        duration_seconds: nullableNumber(formData, "duration_seconds"),
        vod_url: nullableText(formData, "vod_url"),
      };
      await completeTournamentMatch(envelope, accessContext);
    } else if (operation === "walkover") {
      envelope.values = {
        ...version(formData),
        team_a_id: text(formData, "team_a_id"),
        team_b_id: text(formData, "team_b_id"),
        winner_team_id: text(formData, "winner_team_id"),
      };
      await createWalkoverResult(envelope, accessContext);
    } else if (operation === "schedule") {
      envelope.values = { ...version(formData), target_status: "scheduled" };
      await updateTournamentMatchStatus(envelope, accessContext);
    } else if (operation === "start") {
      envelope.values = version(formData);
      await startTournamentMatch(envelope, accessContext);
    } else if (operation === "postpone") {
      envelope.values = version(formData);
      await postponeTournamentMatch(envelope, accessContext);
    } else if (operation === "cancel") {
      envelope.values = version(formData);
      await cancelTournamentMatch(envelope, accessContext);
    } else if (operation === "reopen") {
      envelope.values = {
        ...version(formData),
        target_status: text(formData, "target_status"),
      };
      await reopenTournamentMatch(envelope, accessContext);
    } else {
      envelope.values = version(formData);
      await deleteTournamentMatch(envelope, accessContext);
    }
    return {
      status: "success",
      message: t(currentLocale, "Match updated.", "Матч обновлён."),
      fieldErrors: {},
      values: {},
    };
  } catch (error) {
    if (error instanceof MatchValidationError) {
      return { status: "error", fieldErrors: error.fieldErrors, values };
    }
    if (error instanceof MatchApplicationError) {
      return {
        status: error.code === "MATCH_STALE_UPDATE" ? "conflict" : "error",
        message: errorMessage(error, currentLocale),
        fieldErrors: {},
        values,
      };
    }
    return {
      status: "error",
      message: t(
        currentLocale,
        "We could not complete this action. Please try again.",
        "Не удалось выполнить действие. Повторите попытку.",
      ),
      fieldErrors: {},
      values,
    };
  }
}
