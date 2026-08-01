import { describe, expect, it } from "vitest";

import {
  defaultLocale,
  isLocale,
  localeFromPathname,
  locales,
  localizePath,
  stripLocale,
} from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { ru } from "@/i18n/dictionaries/ru";
import { formatDate, formatDateTime } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "object" ? [path, ...keys(child, path)] : [path];
  });
}

describe("typed localization architecture", () => {
  it("supports only EN and RU with explicit English default", () => {
    expect(locales).toEqual(["en", "ru"]);
    expect(defaultLocale).toBe("en");
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  it("keeps dictionary keys complete and identical", () => {
    expect(keys(ru)).toEqual(keys(en));
    expect(getDictionary("ru").nav.teams).toBe("Команды");
  });

  it("parses and replaces locale without losing dynamic parameters", () => {
    const secretPath = "/en/workspace/abc_DEF-123/teams/team-9";
    expect(localeFromPathname(secretPath)).toBe("en");
    expect(stripLocale(secretPath)).toBe("/workspace/abc_DEF-123/teams/team-9");
    expect(localizePath("ru", secretPath)).toBe(
      "/ru/workspace/abc_DEF-123/teams/team-9",
    );
  });

  it("localizes enum labels without changing stored values", () => {
    expect(en.domain.stageType.group_stage).toBe("Group stage");
    expect(ru.domain.stageType.group_stage).toBe("Групповой этап");
    expect(ru.domain.rosterRole.substitute).toBe("Запасной");
    expect(Object.keys(ru.domain.rosterRole)).toEqual([
      "player",
      "substitute",
      "coach",
      "manager",
    ]);
  });

  it("provides localized stable error codes and UTC date formatting", () => {
    expect(ru.errors.STALE_UPDATE).toContain("Обновите страницу");
    expect(en.errors.UNKNOWN).not.toMatch(/SQLSTATE|Supabase|RPC/i);
    expect(formatDate("2026-08-08", "en")).toContain("Aug");
    expect(formatDate("2026-08-08", "ru")).toContain("авг");
    expect(formatDateTime("2026-08-08T10:00:00Z", "ru")).toContain("10:00");
  });
});
