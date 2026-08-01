"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Locale } from "@/i18n/config";

const en = {
  name: "Name",
  type: "Type",
  sequence: "Sequence",
  start: "Start (ISO with offset)",
  end: "End (ISO with offset)",
  timezone: "Timezone",
  format: "Format",
  bestOf: "Best of",
  teamCount: "Team count",
  locationType: "Location type",
  locationName: "Location name",
  status: "Status",
  notSet: "Not set",
  online: "Online",
  offline: "Offline",
  publicReady:
    "Public items appear on the tournament page after the tournament is published.",
  qualifier: "Qualifier",
  group_stage: "Group stage",
  swiss: "Swiss",
  single_elimination: "Single elimination",
  double_elimination: "Double elimination",
  round_robin: "Round robin",
  playoff: "Playoff",
  final: "Final",
  custom: "Custom",
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
  shortName: "Short name",
  logoUrl: "Logo URL",
  region: "Region",
  seed: "Seed",
  externalTeamId: "External team ID",
  invited: "Invited",
  registered: "Registered",
  confirmed: "Confirmed",
  active: "Active",
  eliminated: "Eliminated",
  withdrawn: "Withdrawn",
  disqualified: "Disqualified",
  addStage: "Add stage",
  saveStage: "Save stage",
  savingStage: "Saving stage…",
  edit: "Edit",
  saveChanges: "Save changes",
  delete: "Delete",
  deleteStage: "Delete stage",
  deletingStage: "Deleting stage…",
  deleteStageQuestion: (name: string) =>
    `Delete “${name}”? This cannot be undone.`,
  dates: "Dates",
  location: "Location",
  teams: "Teams",
  noShortName: "No short name",
  noRegion: "No region",
  addTeam: "Add team",
  saveTeam: "Save team",
  savingTeam: "Saving team…",
  deleteTeam: "Delete team",
  deletingTeam: "Deleting team…",
  deleteTeamQuestion: (name: string) =>
    `Delete “${name}”? Teams with roster history cannot be deleted.`,
  cancel: "Cancel",
  stagesTitle: "Stages",
  stagesHelp: "Sequence controls display order.",
  stagesEmptyTitle: "No stages yet",
  stagesEmpty:
    "Stages define how your tournament is structured, such as qualifiers, groups, and playoffs.",
  teamsTitle: "Teams",
  teamsHelp: "Open a team roster to manage players and staff.",
  teamsEmptyTitle: "No teams yet",
  teamsEmpty: "Add the teams participating in this tournament.",
  manageRoster: "Manage roster",
  rostersTitle: "Rosters",
  rostersHelp: "Rosters stay connected to their tournament teams.",
  activeMembers: "Active members",
  formerMembers: "Former members",
  uniquePlayers: "Unique players",
  noTeamsForRoster: "Add a team before creating a roster.",
  noRosterTitle: "No roster members yet",
  noRoster: "Add players and staff to complete this team roster.",
  player: "Player",
  substitute: "Substitute",
  coach: "Coach",
  manager: "Manager",
  captain: "Captain",
  displayName: "Display name",
  countryCode: "Country code",
  steamId: "Steam ID",
  deadlockId: "Deadlock account ID",
  role: "Role",
  captainLabel: "Team captain",
  joinedAt: "Joined at (optional)",
  createPlayer: "Create player and add to roster",
  findPlayer: "Find existing player",
  query: "Display name or platform ID",
  search: "Search",
  searching: "Searching…",
  addPlayer: "Add player",
  addingPlayer: "Adding player…",
  sameName: "Create a different player even if the same display name exists",
  useExisting: "Use existing player",
  noCountry: "No country",
  editProfile: "Edit player profile",
  sharedProfileWarning:
    "This profile may be used in other tournaments. Changes can affect those rosters.",
  saveProfile: "Save profile",
  savingProfile: "Saving profile…",
  editMembership: "Edit membership",
  saveMembership: "Save membership",
  savingMembership: "Saving membership…",
  removeRoster: "Remove from roster",
  removeQuestion: (name: string) =>
    `Remove “${name}” from this roster? The membership history will be retained.`,
  removing: "Removing…",
  restore: "Restore",
  restoring: "Restoring…",
  profileUpdated: "Player profile updated.",
  genericError: "We could not complete this action. Please try again.",
};

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer Args) => infer Result
    ? (...args: Args) => Result
    : { [Key in keyof T]: Widen<T[Key]> };

const ru = {
  name: "Название",
  type: "Тип",
  sequence: "Порядок",
  start: "Начало (ISO с часовым поясом)",
  end: "Окончание (ISO с часовым поясом)",
  timezone: "Часовой пояс",
  format: "Формат",
  bestOf: "Best of",
  teamCount: "Количество команд",
  locationType: "Формат участия",
  locationName: "Место проведения",
  status: "Статус",
  notSet: "Не указано",
  online: "Онлайн",
  offline: "Офлайн",
  publicReady:
    "Публичные данные отображаются на странице турнира после его публикации.",
  qualifier: "Квалификация",
  group_stage: "Групповой этап",
  swiss: "Швейцарская система",
  single_elimination: "Олимпийская система",
  double_elimination: "Двойное выбывание",
  round_robin: "Круговая система",
  playoff: "Плей-офф",
  final: "Финал",
  custom: "Другое",
  scheduled: "Запланирован",
  live: "Идёт",
  completed: "Завершён",
  cancelled: "Отменён",
  shortName: "Короткое название",
  logoUrl: "URL логотипа",
  region: "Регион",
  seed: "Посев",
  externalTeamId: "Внешний ID команды",
  invited: "Приглашена",
  registered: "Зарегистрирована",
  confirmed: "Подтверждена",
  active: "Активна",
  eliminated: "Выбыла",
  withdrawn: "Снялась",
  disqualified: "Дисквалифицирована",
  addStage: "Добавить этап",
  saveStage: "Сохранить этап",
  savingStage: "Сохранение этапа…",
  edit: "Изменить",
  saveChanges: "Сохранить изменения",
  delete: "Удалить",
  deleteStage: "Удалить этап",
  deletingStage: "Удаление этапа…",
  deleteStageQuestion: (name: string) =>
    `Удалить «${name}»? Это действие нельзя отменить.`,
  dates: "Даты",
  location: "Место",
  teams: "Команды",
  noShortName: "Без короткого названия",
  noRegion: "Регион не указан",
  addTeam: "Добавить команду",
  saveTeam: "Сохранить команду",
  savingTeam: "Сохранение команды…",
  deleteTeam: "Удалить команду",
  deletingTeam: "Удаление команды…",
  deleteTeamQuestion: (name: string) =>
    `Удалить «${name}»? Команду с историей состава удалить нельзя.`,
  cancel: "Отмена",
  stagesTitle: "Этапы",
  stagesHelp: "Порядок определяет последовательность отображения.",
  stagesEmptyTitle: "Этапов пока нет",
  stagesEmpty:
    "Этапы описывают структуру турнира: квалификации, группы и плей-офф.",
  teamsTitle: "Команды",
  teamsHelp: "Откройте состав команды, чтобы управлять игроками и персоналом.",
  teamsEmptyTitle: "Команд пока нет",
  teamsEmpty: "Добавьте команды, участвующие в этом турнире.",
  manageRoster: "Управлять составом",
  rostersTitle: "Составы",
  rostersHelp: "Каждый состав связан с командой турнира.",
  activeMembers: "Активные участники",
  formerMembers: "Бывшие участники",
  uniquePlayers: "Уникальные игроки",
  noTeamsForRoster: "Добавьте команду перед созданием состава.",
  noRosterTitle: "Состав пока пуст",
  noRoster: "Добавьте игроков и персонал, чтобы заполнить состав команды.",
  player: "Игрок",
  substitute: "Запасной",
  coach: "Тренер",
  manager: "Менеджер",
  captain: "Капитан",
  displayName: "Отображаемое имя",
  countryCode: "Код страны",
  steamId: "Steam ID",
  deadlockId: "ID аккаунта Deadlock",
  role: "Роль",
  captainLabel: "Капитан команды",
  joinedAt: "Дата добавления (необязательно)",
  createPlayer: "Создать игрока и добавить в состав",
  findPlayer: "Найти существующего игрока",
  query: "Имя или ID платформы",
  search: "Найти",
  searching: "Поиск…",
  addPlayer: "Добавить игрока",
  addingPlayer: "Добавление игрока…",
  sameName: "Создать другого игрока, даже если такое имя уже существует",
  useExisting: "Добавить найденного игрока",
  noCountry: "Страна не указана",
  editProfile: "Изменить профиль игрока",
  sharedProfileWarning:
    "Этот профиль может использоваться в других турнирах. Изменения затронут связанные составы.",
  saveProfile: "Сохранить профиль",
  savingProfile: "Сохранение профиля…",
  editMembership: "Изменить участие",
  saveMembership: "Сохранить участие",
  savingMembership: "Сохранение участия…",
  removeRoster: "Убрать из состава",
  removeQuestion: (name: string) =>
    `Убрать «${name}» из состава? История участия сохранится.`,
  removing: "Удаление…",
  restore: "Восстановить",
  restoring: "Восстановление…",
  profileUpdated: "Профиль игрока обновлён.",
  genericError: "Не удалось выполнить действие. Повторите попытку.",
} satisfies Widen<typeof en>;

export type OperationalCopy = Widen<typeof en>;
const Context = createContext<OperationalCopy>(en);
const LocaleContext = createContext<Locale>("en");

export function OperationalI18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>
      <Context.Provider value={locale === "ru" ? ru : en}>
        {children}
      </Context.Provider>
    </LocaleContext.Provider>
  );
}
export function useOperationalCopy() {
  return useContext(Context);
}
export function useOperationalLocale() {
  return useContext(LocaleContext);
}

const messageCodes: Record<
  string,
  keyof Pick<OperationalCopy, "profileUpdated" | "genericError">
> = {
  "Player profile updated.": "profileUpdated",
};
export function localizedOperationalMessage(
  message: string | undefined,
  copy: OperationalCopy,
) {
  if (!message) return undefined;
  const key = messageCodes[message];
  return key ? copy[key] : copy.genericError;
}
