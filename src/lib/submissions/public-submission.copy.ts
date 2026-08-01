import type { DictionaryShape } from "@/i18n/types";

export const publicSubmissionCopy = {
  home: {
    eyebrow: "DLTV Organizer Portal",
    title: "Bring your tournament to the Deadlock community.",
    description:
      "Share your tournament details with the DLTV team. We review every submission before publication.",
    action: "Submit a tournament",
  },
  form: {
    eyebrow: "Tournament submission",
    title: "Tell us about your tournament",
    intro:
      "Complete the form below. Required fields are marked with an asterisk.",
    sections: {
      organizer: {
        title: "Organizer contact",
        description: "How our team can reach the tournament organizer.",
      },
      tournament: {
        title: "Tournament details",
        description:
          "The core information players need to understand the event.",
      },
      links: {
        title: "Links and additional information",
        description: "Add any public resources that are already available.",
      },
    },
    fields: {
      organization_name: "Organization name",
      contact_name: "Contact person",
      contact_email: "Contact email",
      discord_username: "Discord username",
      website_url: "Organization website",
      tournament_name: "Tournament name",
      description: "Description",
      region: "Region",
      language: "Language",
      start_date: "Start date",
      end_date: "End date",
      timezone: "Timezone",
      format: "Tournament format",
      prize_pool_text: "Prize pool",
      is_online: "This is an online tournament",
      max_teams: "Maximum teams",
      registration_deadline: "Registration deadline",
      registration_url: "Registration link",
      bracket_url: "Bracket link",
      discord_url: "Discord link",
      stream_url: "Stream link",
      rules_url: "Rules link",
      organizer_notes: "Additional notes",
    },
    helpers: {
      region: "Example: EU, NA, APAC, CIS",
      timezone: "Use an IANA timezone, for example Europe/Berlin",
      format: "Example: Single elimination, League, Swiss",
      prize_pool_text: "Example: $5,000 or Community prizes",
      registration_deadline:
        "ISO 8601 with timezone, e.g. 2026-08-05T18:00:00+02:00",
    },
    consent:
      "I confirm that I am authorized to submit this tournament information and allow Deadlock One / DLTV to publish, edit for clarity, translate, and distribute it on its own and partner platforms.",
    submit: "Submit tournament",
    submitting: "Submitting tournament…",
    browse: "Browse published tournaments",
  },
  success: {
    eyebrow: "Submission received",
    title: "Thank you",
    statusLabel: "Current status",
    status: "Submitted",
    referenceLabel: "Submission ID",
    review: "The DLTV team will review your tournament before publication.",
    saveReference:
      "Save this submission ID. It is the reference for your request.",
    another: "Submit another tournament",
    browse: "Browse tournaments",
    invalidReference:
      "This submission reference is invalid. No tournament data was loaded.",
  },
  errors: {
    generic:
      "We could not submit the tournament. Check the form and try again.",
    required: "Complete this required field.",
    consent: "You must confirm the publication consent.",
    invalid: {
      organization_name: "Enter a valid organization name.",
      contact_name: "Enter a valid contact person.",
      contact_email: "Enter a valid email address.",
      discord_username: "Enter a shorter Discord username.",
      website_url: "Enter a valid http or https URL.",
      tournament_name: "Enter a valid tournament name.",
      description: "Enter a shorter description.",
      region: "Enter a valid region.",
      language: "Enter a shorter language value.",
      start_date: "Enter a valid start date.",
      end_date: "End date must be on or after the start date.",
      timezone: "Enter a valid IANA timezone.",
      format: "Enter a shorter tournament format.",
      prize_pool_text: "Enter a shorter prize pool description.",
      is_online: "Choose whether the tournament is online.",
      max_teams: "Enter a positive whole number.",
      registration_deadline:
        "Enter an ISO 8601 date and time with a timezone offset.",
      registration_url: "Enter a valid http or https URL.",
      bracket_url: "Enter a valid http or https URL.",
      discord_url: "Enter a valid http or https URL.",
      stream_url: "Enter a valid http or https URL.",
      rules_url: "Enter a valid http or https URL.",
      organizer_notes: "Enter shorter additional notes.",
      consent_to_publish: "You must confirm the publication consent.",
    },
  },
} as const;

export const popularTimezones = [
  "UTC",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export const ruPublicSubmissionCopy = {
  home: {
    eyebrow: "DLTV Organizer Portal",
    title: "Расскажите сообществу Deadlock о своём турнире.",
    description:
      "Отправьте сведения о турнире команде DLTV. Мы проверим заявку перед публикацией.",
    action: "Добавить турнир",
  },
  form: {
    eyebrow: "Заявка на турнир",
    title: "Расскажите о своём турнире",
    intro: "Заполните форму. Обязательные поля отмечены звёздочкой.",
    sections: {
      organizer: {
        title: "Контакты организатора",
        description: "Как наша команда может связаться с организатором.",
      },
      tournament: {
        title: "Сведения о турнире",
        description: "Основная информация, необходимая участникам.",
      },
      links: {
        title: "Ссылки и дополнительная информация",
        description: "Добавьте уже доступные публичные ресурсы.",
      },
    },
    fields: {
      organization_name: "Название организации",
      contact_name: "Контактное лицо",
      contact_email: "Email для связи",
      discord_username: "Имя пользователя Discord",
      website_url: "Сайт организации",
      tournament_name: "Название турнира",
      description: "Описание",
      region: "Регион",
      language: "Язык",
      start_date: "Дата начала",
      end_date: "Дата окончания",
      timezone: "Часовой пояс",
      format: "Формат турнира",
      prize_pool_text: "Призовой фонд",
      is_online: "Турнир проходит онлайн",
      max_teams: "Максимум команд",
      registration_deadline: "Окончание регистрации",
      registration_url: "Ссылка на регистрацию",
      bracket_url: "Ссылка на сетку",
      discord_url: "Ссылка на Discord",
      stream_url: "Ссылка на трансляцию",
      rules_url: "Ссылка на правила",
      organizer_notes: "Дополнительные примечания",
    },
    helpers: {
      region: "Например: EU, NA, APAC, CIS",
      timezone: "Укажите часовой пояс IANA, например Europe/Moscow",
      format: "Например: Single elimination, League, Swiss",
      prize_pool_text: "Например: $5,000 или призы сообщества",
      registration_deadline:
        "ISO 8601 с часовым поясом, например 2026-08-05T18:00:00+03:00",
    },
    consent:
      "Я подтверждаю право отправить эти сведения и разрешаю Deadlock One / DLTV публиковать, редактировать для ясности, переводить и распространять их на собственных и партнёрских платформах.",
    submit: "Отправить турнир",
    submitting: "Отправка турнира…",
    browse: "Смотреть опубликованные турниры",
  },
  success: {
    eyebrow: "Заявка получена",
    title: "Спасибо",
    statusLabel: "Текущий статус",
    status: "Отправлена",
    referenceLabel: "Номер заявки",
    review: "Команда DLTV проверит турнир перед публикацией.",
    saveReference: "Сохраните номер заявки — он понадобится для обращений.",
    another: "Отправить ещё один турнир",
    browse: "Смотреть турниры",
    invalidReference:
      "Номер заявки недействителен. Данные турнира не загружены.",
  },
  errors: {
    generic:
      "Не удалось отправить турнир. Проверьте форму и повторите попытку.",
    required: "Заполните обязательное поле.",
    consent: "Необходимо подтвердить согласие на публикацию.",
    invalid: {
      organization_name: "Укажите корректное название организации.",
      contact_name: "Укажите корректное контактное лицо.",
      contact_email: "Укажите корректный email.",
      discord_username: "Сократите имя пользователя Discord.",
      website_url: "Укажите корректный URL с http или https.",
      tournament_name: "Укажите корректное название турнира.",
      description: "Сократите описание.",
      region: "Укажите корректный регион.",
      language: "Сократите название языка.",
      start_date: "Укажите корректную дату начала.",
      end_date: "Дата окончания должна быть не раньше даты начала.",
      timezone: "Укажите корректный часовой пояс IANA.",
      format: "Сократите описание формата.",
      prize_pool_text: "Сократите описание призового фонда.",
      is_online: "Укажите, проходит ли турнир онлайн.",
      max_teams: "Укажите положительное целое число.",
      registration_deadline: "Укажите дату и время ISO 8601 с часовым поясом.",
      registration_url: "Укажите корректный URL с http или https.",
      bracket_url: "Укажите корректный URL с http или https.",
      discord_url: "Укажите корректный URL с http или https.",
      stream_url: "Укажите корректный URL с http или https.",
      rules_url: "Укажите корректный URL с http или https.",
      organizer_notes: "Сократите дополнительные примечания.",
      consent_to_publish: "Необходимо подтвердить согласие на публикацию.",
    },
  },
} as const satisfies DictionaryShape<typeof publicSubmissionCopy>;

export function getPublicSubmissionCopy(locale: "en" | "ru") {
  return locale === "ru" ? ruPublicSubmissionCopy : publicSubmissionCopy;
}
