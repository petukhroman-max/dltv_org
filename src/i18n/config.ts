export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

export function stripLocale(pathname: string): string {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname;
  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function localizePath(locale: Locale, pathname: string): string {
  const normalized = stripLocale(pathname);
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}
