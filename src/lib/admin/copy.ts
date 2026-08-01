import type { Locale } from "@/i18n/config";
import type { DictionaryShape } from "@/i18n/types";

export const adminCopy = {
  brand: "DLTV Organizer Portal",
  nav: {
    section: "Admin",
    submissions: "Submissions",
    logout: "Logout",
  },
  login: {
    eyebrow: "DLTV Organizer Portal",
    title: "Admin access",
    description:
      "Enter your admin email. Supabase will send a secure magic link if the address can receive one.",
    emailLabel: "Email address",
    submit: "Send magic link",
    submitting: "Sending magic link…",
    invalidEmail: "Enter a valid email address.",
    genericSuccess:
      "If the address can receive an admin sign-in link, check its inbox.",
    callbackError: "We could not complete sign in. Request a new magic link.",
  },
  unauthorized: {
    title: "Access denied",
    description: "This account cannot access the administration area.",
    back: "Back to login",
  },
  list: {
    eyebrow: "Read-only moderation",
    title: "Tournament submissions",
    description:
      "Review incoming organizer submissions. Editing and status changes are not available in this interface.",
    filters: "Filter submissions",
    status: "Status",
    allStatuses: "All statuses",
    region: "Region",
    startFrom: "Starts from",
    startTo: "Starts to",
    apply: "Apply filters",
    clear: "Clear",
    empty: "No submissions found.",
    error: "Submissions could not be loaded.",
    columns: {
      tournament: "Tournament",
      organizer: "Organizer",
      region: "Region",
      startDate: "Start date",
      status: "Status",
      submittedAt: "Submitted at",
      updatedAt: "Last updated",
      view: "View",
    },
    previous: "Previous page",
    next: "Next page",
  },
  details: {
    back: "Back to submissions",
    tournament: "Tournament",
    organizer: "Organizer",
    links: "Links",
    audit: "Audit history",
    noEvents: "No audit events found.",
    notAvailable: "Not provided",
    online: "Online",
    offline: "Offline",
    consentToPublish: "Consent to publish",
    consentVersion: "Consent version",
    unknownMetadata: "Additional metadata",
    moderation: "Moderation",
  },
  error: {
    title: "Admin area unavailable",
    description: "The requested admin data could not be loaded. Try again.",
    retry: "Try again",
  },
  notFound: {
    title: "Submission not found",
    description: "The requested submission does not exist.",
    back: "Back to submissions",
  },
} as const;

export const ruAdminCopy = {
  brand: "DLTV Organizer Portal",
  nav: { section: "Администратор", submissions: "Заявки", logout: "Выйти" },
  login: {
    eyebrow: "DLTV Organizer Portal",
    title: "Вход для администратора",
    description:
      "Укажите email администратора. Supabase отправит безопасную ссылку, если адрес имеет доступ.",
    emailLabel: "Email",
    submit: "Отправить ссылку",
    submitting: "Отправка ссылки…",
    invalidEmail: "Укажите корректный email.",
    genericSuccess: "Если адрес имеет доступ, проверьте входящие сообщения.",
    callbackError: "Не удалось завершить вход. Запросите новую ссылку.",
  },
  unauthorized: {
    title: "Доступ запрещён",
    description: "У этой учётной записи нет доступа к администрированию.",
    back: "Назад ко входу",
  },
  list: {
    eyebrow: "Модерация",
    title: "Заявки на турниры",
    description:
      "Проверяйте заявки организаторов и переходите к модерации и данным турнира.",
    filters: "Фильтры",
    status: "Статус",
    allStatuses: "Все статусы",
    region: "Регион",
    startFrom: "Начало с",
    startTo: "Начало до",
    apply: "Применить",
    clear: "Очистить",
    empty: "Заявки не найдены.",
    error: "Не удалось загрузить заявки.",
    columns: {
      tournament: "Турнир",
      organizer: "Организатор",
      region: "Регион",
      startDate: "Дата начала",
      status: "Статус",
      submittedAt: "Отправлена",
      updatedAt: "Обновлена",
      view: "Открыть",
    },
    previous: "Предыдущая страница",
    next: "Следующая страница",
  },
  details: {
    back: "Назад к заявкам",
    tournament: "Турнир",
    organizer: "Организатор",
    links: "Ссылки",
    audit: "История изменений",
    noEvents: "Событий пока нет.",
    notAvailable: "Не указано",
    online: "Онлайн",
    offline: "Офлайн",
    consentToPublish: "Согласие на публикацию",
    consentVersion: "Версия согласия",
    unknownMetadata: "Дополнительные данные",
    moderation: "Модерация",
  },
  error: {
    title: "Админ-раздел недоступен",
    description: "Не удалось загрузить данные. Повторите попытку.",
    retry: "Повторить",
  },
  notFound: {
    title: "Заявка не найдена",
    description: "Запрошенная заявка не существует.",
    back: "Назад к заявкам",
  },
} as const satisfies DictionaryShape<typeof adminCopy>;

export function getAdminCopy(locale: Locale) {
  return locale === "ru" ? ruAdminCopy : adminCopy;
}
