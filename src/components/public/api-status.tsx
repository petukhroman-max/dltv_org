"use client";

import { useEffect, useState } from "react";

import type { Locale } from "@/i18n/config";

type ApiStatusCopy = {
  apiStatusLabel: string;
  apiStatusChecking: string;
  apiStatusOnline: string;
  apiStatusDegraded: string;
  apiStatusOffline: string;
  apiStatusCheckedAt: string;
};

type StatusState = "checking" | "online" | "degraded" | "offline";

/**
 * Индикатор состояния публичного API.
 * Статус берётся только из реального ответа GET /api/v1 — никаких
 * захардкоженных «API Online» и выдуманных таймстемпов синхронизации.
 */
export function ApiStatus({
  copy,
  locale,
}: {
  copy: ApiStatusCopy;
  locale: Locale;
}) {
  const [state, setState] = useState<StatusState>("checking");
  const [serverTimestamp, setServerTimestamp] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch("/api/v1", {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          setState("degraded");
          setServerTimestamp(null);
          return;
        }
        const payload: unknown = await response.json();
        const timestamp =
          typeof payload === "object" &&
          payload !== null &&
          "data" in payload &&
          typeof (payload as { data: unknown }).data === "object" &&
          (payload as { data: unknown }).data !== null &&
          "server_timestamp" in (payload as { data: Record<string, unknown> })
            .data
            ? (payload as { data: Record<string, unknown> }).data
                .server_timestamp
            : null;
        setState("online");
        setServerTimestamp(typeof timestamp === "string" ? timestamp : null);
      } catch {
        if (controller.signal.aborted) return;
        setState("offline");
        setServerTimestamp(null);
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

  const label =
    state === "online"
      ? copy.apiStatusOnline
      : state === "degraded"
        ? copy.apiStatusDegraded
        : state === "offline"
          ? copy.apiStatusOffline
          : copy.apiStatusChecking;

  // Время берём из server_timestamp самого ответа, а не из клиентских часов.
  const checkedAt = serverTimestamp
    ? copy.apiStatusCheckedAt.replace(
        "{time}",
        new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          timeZoneName: "short",
        }).format(new Date(serverTimestamp)),
      )
    : null;

  return (
    <p className="apiStatus" data-state={state} aria-live="polite">
      <span className="visuallyHidden">{copy.apiStatusLabel}: </span>
      <span className="apiStatusDot" aria-hidden="true" />
      <span>{label}</span>
      {checkedAt ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={serverTimestamp ?? undefined}>{checkedAt}</time>
        </>
      ) : null}
    </p>
  );
}
