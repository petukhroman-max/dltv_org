import type { Locale } from "@/i18n/config";

const en = {
  title: "Import tournament data",
  description:
    "Parse, validate and preview a workbook before any tournament data changes.",
  source: "1. Source",
  parsing: "2. Parsing",
  mapping: "3. Mapping",
  validation: "4. Validation",
  preview: "5. Preview",
  conflicts: "6. Conflicts",
  confirmation: "7. Confirmation",
  report: "8. Report",
  xlsx: "Upload XLSX",
  google: "Public Google Sheets",
  googlePlaceholder: "https://docs.google.com/spreadsheets/d/…",
  upload: "Parse workbook",
  template: "Detected template",
  status: "Session status",
  sheets: "Detected sheets",
  row: "Source",
  sourceReferences: "Source rows",
  entity: "Entity",
  action: "Proposed action",
  data: "Safe preview",
  errors: "Errors",
  warnings: "Warnings",
  timezoneTitle: "Confirm import timezone",
  timezoneLabel: "Timezone for rows without one",
  timezoneWarning:
    "Stages and matches without a timezone require a common fallback before import.",
  timezoneConfirmation:
    "Apply this timezone only to imported stages and matches where timezone is empty",
  timezoneConfirm: "Confirm timezone",
  all: "All",
  create: "Create",
  update: "Update",
  conflict: "Conflict",
  invalid: "Invalid",
  skip: "Skipped",
  resolve: "Resolve conflict",
  resolving: "Resolving…",
  keep: "Keep existing",
  useSheet: "Use spreadsheet value",
  skipRow: "Skip row",
  link: "Link to existing entity",
  createNew: "Create new entity",
  existingEntitySearch: "Existing entity",
  existingEntityPlaceholder: "Search by name or match label",
  highRisk: "I explicitly confirm replacing a completed result",
  confirm: "Apply import atomically",
  cancel: "Cancel session",
  blocked: "Resolve every conflict and invalid row before applying.",
  noSession:
    "Upload a workbook or provide a public Google Sheets URL to begin.",
  mappingRequired:
    "This layout needs explicit column mapping. No data has been written. Re-upload after selecting a supported Guildlock layout.",
  privacy:
    "Private player identifiers are redacted in preview and never included in audit metadata or public output.",
  completed: "Import completed",
  back: "Back to tournament workspace",
  errorPrefix: "Import could not continue",
  resolvedSuccess: "Conflict resolved. The preview has been refreshed.",
  revalidatedSuccess: "The import was revalidated from current database state.",
  retryValidation: "Reload and validate again",
  blockingSeverity: "Blocking",
  warningSeverity: "Review",
} as const;

type ImportCopy = { [Key in keyof typeof en]: string };

const ru: ImportCopy = {
  title: "Импорт данных турнира",
  description:
    "Разбор, проверка и предпросмотр таблицы до любых изменений турнира.",
  source: "1. Источник",
  parsing: "2. Разбор",
  mapping: "3. Сопоставление",
  validation: "4. Проверка",
  preview: "5. Предпросмотр",
  conflicts: "6. Конфликты",
  confirmation: "7. Подтверждение",
  report: "8. Отчёт",
  xlsx: "Загрузить XLSX",
  google: "Публичная Google Таблица",
  googlePlaceholder: "https://docs.google.com/spreadsheets/d/…",
  upload: "Разобрать таблицу",
  template: "Определённый шаблон",
  status: "Статус сессии",
  sheets: "Найденные листы",
  row: "Источник",
  sourceReferences: "Исходные строки",
  entity: "Сущность",
  action: "Предлагаемое действие",
  data: "Безопасный предпросмотр",
  errors: "Ошибки",
  warnings: "Предупреждения",
  timezoneTitle: "Подтвердите часовой пояс импорта",
  timezoneLabel: "Часовой пояс для строк без значения",
  timezoneWarning:
    "Для этапов и матчей без часового пояса необходимо выбрать общее резервное значение.",
  timezoneConfirmation:
    "Применить этот часовой пояс только к импортируемым этапам и матчам с пустым значением",
  timezoneConfirm: "Подтвердить часовой пояс",
  all: "Все",
  create: "Создать",
  update: "Обновить",
  conflict: "Конфликт",
  invalid: "Ошибка",
  skip: "Пропущено",
  resolve: "Разрешить конфликт",
  resolving: "Разрешение…",
  keep: "Сохранить текущее",
  useSheet: "Использовать значение таблицы",
  skipRow: "Пропустить строку",
  link: "Связать с существующей сущностью",
  createNew: "Создать новую сущность",
  existingEntitySearch: "Существующая сущность",
  existingEntityPlaceholder: "Поиск по названию или метке матча",
  highRisk: "Я явно подтверждаю замену завершённого результата",
  confirm: "Применить импорт атомарно",
  cancel: "Отменить сессию",
  blocked: "До импорта разрешите все конфликты и исправьте ошибочные строки.",
  noSession:
    "Для начала загрузите таблицу или укажите публичную ссылку Google Sheets.",
  mappingRequired:
    "Для этой структуры нужно явное сопоставление колонок. Данные не записаны. Загрузите поддерживаемый шаблон Guildlock.",
  privacy:
    "Приватные ID игроков скрыты в предпросмотре и не попадают в аудит или публичные данные.",
  completed: "Импорт завершён",
  back: "Назад в кабинет турнира",
  errorPrefix: "Не удалось продолжить импорт",
  resolvedSuccess: "Конфликт разрешён. Предпросмотр обновлён.",
  revalidatedSuccess:
    "Импорт повторно проверен по актуальному состоянию базы данных.",
  retryValidation: "Обновить и проверить снова",
  blockingSeverity: "Блокирует импорт",
  warningSeverity: "Требует внимания",
};

export const getImportCopy = (locale: Locale) => (locale === "ru" ? ru : en);

const issueMessages: Record<string, { en: string; ru: string }> = {
  timezone_fallback_confirmation_required: {
    en: "Confirm a timezone for rows where it is missing.",
    ru: "Подтвердите часовой пояс для строк, где он не указан.",
  },
  duplicate_match_number: {
    en: "This match number is used more than once in the same stage.",
    ru: "Этот номер матча используется в этапе несколько раз.",
  },
  winner_not_participant: {
    en: "The winner does not match either participant.",
    ru: "Победитель не совпадает ни с одной из команд матча.",
  },
  series_score_not_available: {
    en: "The source contains game results but no reliable series score; the result will not be imported.",
    ru: "Источник содержит результаты игр, но не надёжный счёт серии; результат не будет импортирован.",
  },
  multiple_game_rows_for_series: {
    en: "Multiple game rows map to one series. Review the consolidated match before import.",
    ru: "Несколько строк игр относятся к одной серии. Проверьте объединённый матч перед импортом.",
  },
  duplicate_match_data_conflict: {
    en: "Duplicate match rows contain conflicting participants or results.",
    ru: "Повторяющиеся строки матча содержат разные составы участников или результаты.",
  },
  completed_match_result_required: {
    en: "A completed match requires both participants, scores and a winner.",
    ru: "Для завершённого матча нужны оба участника, счёт и победитель.",
  },
  completed_result_inconsistent: {
    en: "The winner is inconsistent with the series score.",
    ru: "Победитель не соответствует счёту серии.",
  },
  result_status_inconsistent: {
    en: "This status cannot contain a winner.",
    ru: "При этом статусе победитель не может быть указан.",
  },
  score_without_participant: {
    en: "A score cannot be assigned without the corresponding participant.",
    ru: "Нельзя указать счёт без соответствующего участника.",
  },
  walkover_winner_required: {
    en: "A walkover requires both participants and a winner.",
    ru: "Для технической победы нужны оба участника и победитель.",
  },
  google_sheets_url_invalid: {
    en: "Enter a valid public Google Sheets document URL.",
    ru: "Укажите корректную публичную ссылку на Google Таблицу.",
  },
  google_sheets_host_rejected: {
    en: "Only public docs.google.com spreadsheet links are supported.",
    ru: "Поддерживаются только публичные ссылки docs.google.com на таблицы.",
  },
  google_sheets_redirect_rejected: {
    en: "Google returned an unexpected download address.",
    ru: "Google вернул неожиданный адрес загрузки.",
  },
  google_sheets_download_too_large: {
    en: "The Google Sheets export exceeds the import size limit.",
    ru: "Экспорт Google Таблицы превышает допустимый размер.",
  },
  google_sheets_download_timeout: {
    en: "The Google Sheets export timed out. Try again.",
    ru: "Истекло время загрузки Google Таблицы. Повторите попытку.",
  },
  google_sheets_content_type_rejected: {
    en: "Google did not return an XLSX workbook.",
    ru: "Google не вернул книгу XLSX.",
  },
  google_sheets_content_invalid: {
    en: "The downloaded file is not a valid XLSX workbook.",
    ru: "Загруженный файл не является корректной книгой XLSX.",
  },
  google_sheets_download_failed: {
    en: "The spreadsheet could not be downloaded. Make sure anyone with the link can view it.",
    ru: "Не удалось скачать таблицу. Проверьте, что доступ открыт всем, у кого есть ссылка.",
  },
  import_session_stale: {
    en: "The import preview changed in another request. Review the refreshed row and try again.",
    ru: "Предпросмотр импорта изменился в другом запросе. Проверьте обновлённую строку и повторите попытку.",
  },
  import_resolution_existing_not_found: {
    en: "No existing entity was matched automatically. Choose Link to existing or another resolution.",
    ru: "Существующая сущность не была найдена автоматически. Выберите «Связать с существующей» или другое решение.",
  },
  import_resolution_existing_required: {
    en: "Select an existing entity to link.",
    ru: "Выберите существующую сущность для связывания.",
  },
  import_resolution_existing_rejected: {
    en: "The selected entity is not available for this tournament.",
    ru: "Выбранная сущность недоступна для этого турнира.",
  },
  import_resolution_already_resolved: {
    en: "This conflict has already been resolved differently. Review the refreshed preview.",
    ru: "Этот конфликт уже разрешён другим способом. Проверьте обновлённый предпросмотр.",
  },
  import_completed_result_confirmation_required: {
    en: "Confirm the completed-result overwrite before using the spreadsheet value.",
    ru: "Подтвердите замену завершённого результата перед использованием значения таблицы.",
  },
  import_resolution_failed: {
    en: "The conflict could not be resolved. Refresh the preview and try again.",
    ru: "Не удалось разрешить конфликт. Обновите предпросмотр и повторите попытку.",
  },
  import_session_not_ready: {
    en: "The import preview is not ready. Reload it and review the remaining blocker.",
    ru: "Предпросмотр импорта не готов. Обновите страницу и проверьте оставшийся блокирующий объект.",
  },
  import_apply_failed: {
    en: "The import could not be applied. Reload the preview and try again.",
    ru: "Не удалось применить импорт. Обновите предпросмотр и повторите попытку.",
  },
  import_revalidation_failed: {
    en: "The import could not be revalidated. Reload the page and try again.",
    ru: "Не удалось повторно проверить импорт. Обновите страницу и повторите попытку.",
  },
};

export function getImportIssueMessage(locale: Locale, code: string): string {
  const [kind, entity, sheet, row] = code.split("|");
  if (kind === "import_blocking_row") {
    return locale === "ru"
      ? `Остался блокирующий объект ${entity} в ${sheet}, строка ${row}.`
      : `A blocking ${entity} remains in ${sheet}, row ${row}.`;
  }
  if (kind === "import_apply_row") {
    const [, failedEntity, failedSheet, failedRow, action, step, reason] =
      code.split("|");
    const reasonText =
      reason === "import_reference_unresolved"
        ? locale === "ru"
          ? "не удалось определить связанную сущность"
          : "a referenced entity could not be resolved"
        : reason === "import_database_function_missing"
          ? locale === "ru"
            ? "недоступна необходимая функция базы данных"
            : "a required database function is unavailable"
          : reason === "import_unique_constraint"
            ? locale === "ru"
              ? "запись нарушает ограничение уникальности"
              : "the row violates a uniqueness constraint"
            : reason === "import_check_constraint"
              ? locale === "ru"
                ? "запись не соответствует правилам данных"
                : "the row violates a data constraint"
              : locale === "ru"
                ? "база данных отклонила запись"
                : "the database rejected the row";
    return locale === "ru"
      ? `Импорт остановлен при действии ${action} для ${failedEntity} из «${failedSheet}», строка ${failedRow} (шаг ${step}): ${reasonText}. Все изменения отменены.`
      : `Import failed while performing ${action} for ${failedEntity} from “${failedSheet}”, row ${failedRow} (step ${step}): ${reasonText}. All changes were rolled back.`;
  }
  return (
    issueMessages[code]?.[locale] ??
    (locale === "ru"
      ? "Строка требует проверки перед импортом."
      : "This row requires review before import.")
  );
}
