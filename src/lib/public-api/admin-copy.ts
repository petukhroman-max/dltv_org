import type { Locale } from "@/i18n/config";

const copy = {
  en: {
    requests: "API Access Requests",
    clients: "API Clients",
    review: "Review",
    manage: "Manage",
    createKey: "Create API key",
    rotateKey: "Rotate key",
    creating: "Creating…",
    copyNow: "Copy this key now",
    shownOnce: "This secret is shown once and cannot be recovered.",
    copyKey: "Copy key",
    saved: "I have saved it",
    copied: "Copied",
    label: "Label",
    expires: "Expires at (optional)",
    storage:
      "Store this key in a secret manager or server-side environment variable. Never commit it to source control.",
    organization: "Organization",
    contact: "Contact",
    status: "Status",
    created: "Created",
    attribution: "Attribution",
    limits: "Limits",
    rotateConfirm:
      "Rotate this key? The current key will be permanently revoked.",
  },
  ru: {
    requests: "Заявки на API-доступ",
    clients: "API-клиенты",
    review: "Рассмотреть",
    manage: "Управление",
    createKey: "Создать API-ключ",
    rotateKey: "Ротировать ключ",
    creating: "Создание…",
    copyNow: "Скопируйте ключ сейчас",
    shownOnce: "Секрет показывается один раз и не может быть восстановлен.",
    copyKey: "Скопировать ключ",
    saved: "Ключ сохранён",
    copied: "Скопировано",
    label: "Название",
    expires: "Срок действия (необязательно)",
    storage:
      "Храните ключ в secret manager или server-side environment variable. Никогда не коммитьте его в репозиторий.",
    organization: "Организация",
    contact: "Контакт",
    status: "Статус",
    created: "Создано",
    attribution: "Атрибуция",
    limits: "Лимиты",
    rotateConfirm: "Ротировать ключ? Текущий ключ будет безвозвратно отозван.",
  },
} as const;

export function getApiAdminCopy(locale: Locale) {
  return copy[locale];
}
