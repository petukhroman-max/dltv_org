import type { Locale } from "@/i18n/config";

const en = {
  access: {
    eyebrow: "DLTV Public API",
    title: "Request API access",
    description:
      "Apply for authenticated, read-only access to published DLTV tournament data.",
    organization: "Organization name",
    contact: "Contact name",
    email: "Contact email",
    website: "Website URL",
    use: "How will you use the data?",
    volume: "Expected request volume (optional)",
    endpoints: "Requested data",
    attribution:
      "I will display “Data provided by DLTV” (or a localized equivalent) and link to deadlock.one where links are supported.",
    terms: "I agree to the DLTV Public API Terms (version 2026-08-v1).",
    privacy:
      "We use these contact details only to review and administer API access. API credentials are never collected by this form.",
    submit: "Submit request",
    submitting: "Submitting…",
    success:
      "Your API access request has been submitted. We will contact you after reviewing it.",
    error:
      "The request could not be submitted. Check the fields and try again.",
  },
  terms: {
    title: "DLTV Public API Terms",
    version: "Version 2026-08-v1",
    intro:
      "API access is granted individually for read-only use of published tournament data.",
    items: [
      "Identify DLTV as the data source and link to deadlock.one where the format supports links.",
      "Keep the attribution visible near the data or on a clearly linked page; do not hide it where users cannot find it.",
      "Do not present DLTV data as your own or resell raw API access without permission.",
      "Do not bypass access controls or rate limits, share credentials, or use the API for private data.",
      "DLTV may suspend or revoke access and may change or discontinue the API.",
      "Availability, completeness, and uninterrupted operation are not guaranteed.",
    ],
    contact:
      "Contact DLTV if your integration or attribution implementation changes materially.",
  },
} as const;

const ru = {
  access: {
    eyebrow: "DLTV Public API",
    title: "Запрос доступа к API",
    description:
      "Подайте заявку на аутентифицированный read-only доступ к опубликованным турнирным данным DLTV.",
    organization: "Название организации",
    contact: "Контактное лицо",
    email: "Контактный email",
    website: "URL сайта",
    use: "Как вы будете использовать данные?",
    volume: "Ожидаемый объём запросов (необязательно)",
    endpoints: "Запрашиваемые данные",
    attribution:
      "Я буду указывать «Данные предоставлены DLTV» (или локализованный эквивалент) и ссылку на deadlock.one там, где формат поддерживает ссылки.",
    terms: "Я принимаю условия DLTV Public API (версия 2026-08-v1).",
    privacy:
      "Контактные данные используются только для рассмотрения и администрирования API-доступа. Форма никогда не запрашивает API-ключи.",
    submit: "Отправить заявку",
    submitting: "Отправка…",
    success:
      "Заявка на доступ к API отправлена. Мы свяжемся с вами после рассмотрения.",
    error: "Не удалось отправить заявку. Проверьте поля и повторите попытку.",
  },
  terms: {
    title: "Условия DLTV Public API",
    version: "Версия 2026-08-v1",
    intro:
      "Доступ предоставляется индивидуально только для read-only использования опубликованных турнирных данных.",
    items: [
      "Указывайте DLTV как источник данных и ссылку на deadlock.one, если формат поддерживает ссылки.",
      "Размещайте атрибуцию рядом с данными или на явно связанной странице; не скрывайте источник от пользователя.",
      "Не выдавайте данные DLTV за собственные и не перепродавайте raw API-доступ без разрешения.",
      "Не обходите контроль доступа и rate limits, не передавайте ключи и не используйте API для приватных данных.",
      "DLTV может приостановить или отозвать доступ, изменить или прекратить работу API.",
      "Доступность, полнота данных и бесперебойная работа не гарантируются.",
    ],
    contact:
      "Свяжитесь с DLTV при существенном изменении интеграции или реализации атрибуции.",
  },
} as const;

export function getPublicApiCopy(locale: Locale) {
  return locale === "ru" ? ru : en;
}
