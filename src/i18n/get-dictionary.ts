import { headers } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { en, type Dictionary } from "@/i18n/dictionaries/en";
import { ru } from "@/i18n/dictionaries/ru";

const dictionaries: Record<Locale, Dictionary> = { en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export async function getRequestLocale(): Promise<Locale> {
  try {
    const value = (await headers()).get("x-dltv-locale");
    return isLocale(value) ? value : defaultLocale;
  } catch {
    // Component unit tests and non-request rendering use the explicit default.
    return defaultLocale;
  }
}

export async function getRequestDictionary(): Promise<Dictionary> {
  return getDictionary(await getRequestLocale());
}
