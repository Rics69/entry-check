/**
 * События воронки → /api/events → таблица events в D1. Только в браузере.
 * Без cookie и без идентификаторов человека: имя события, язык, источник перехода (?ref=) и пара свойств.
 */

export const EVENT_NAMES = [
  "check_open",
  "check_result",
  "official_click",
  "site_check",
  "buy_click",
  "pass_waitlist",
  "share",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];
export type EventProps = Record<string, string | number | boolean>;

const REF_KEY = "ec_ref";
const REF_RE = /^[a-z0-9_-]{1,32}$/;

/** Запоминаем ?ref=reddit на время сессии, чтобы приписать к событиям на следующих страницах. */
export function rememberRef(search: string = location.search): void {
  const ref = new URLSearchParams(search).get("ref")?.toLowerCase();
  if (!ref || !REF_RE.test(ref)) return;
  try {
    sessionStorage.setItem(REF_KEY, ref);
  } catch {
    // Приватный режим или запрет хранилища — просто без источника.
  }
}

export function currentRef(): string | null {
  try {
    return sessionStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

export function track(name: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ name, locale: document.documentElement.lang, ref: currentRef(), props });
  try {
    const sent = navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }));
    if (sent) return;
  } catch {
    // sendBeacon недоступен — пробуем fetch.
  }
  void fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}
