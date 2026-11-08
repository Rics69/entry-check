import type { Trip, TripStop } from "@/lib/rules/types";

/**
 * Маршрут ↔ параметр ?d= в адресе.
 *
 * Формат v1: `1.<ПАСПОРТ>.<ТОЧКА>.<ТОЧКА>...`
 * Точка: <СТРАНА><ГГГГММДД>[<ЧЧММ>][t], где `t` — только пересадка.
 *
 *   1.RU.TH20261215.VN202612220930.SG20261230t
 *   └ версия └ паспорт └ Таиланд 15.12 └ Вьетнам 22.12 в 09:30 └ пересадка в Сингапуре 30.12
 *
 * Только латиница, цифры и точки — ссылка не портится в мессенджерах и не требует экранирования.
 */

export const MAX_STOPS = 8;
const VERSION = "1";

const STOP_RE = /^([A-Z]{2})(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2}))?(t)?$/;

export function encodeTrip(trip: Trip): string {
  const stops = trip.stops.map((stop) => {
    const date = stop.date.replaceAll("-", "");
    const time = stop.time ? stop.time.replace(":", "") : "";
    return `${stop.country}${date}${time}${stop.transit ? "t" : ""}`;
  });
  return [VERSION, trip.passport, ...stops].join(".");
}

/** null — если строка повреждена или не нашего формата. */
export function decodeTrip(value: string | null | undefined): Trip | null {
  if (!value) return null;
  const [version, passport, ...rawStops] = value.trim().split(".");
  if (version !== VERSION) return null;
  if (!/^[A-Z]{2}$/.test(passport ?? "")) return null;
  if (rawStops.length === 0 || rawStops.length > MAX_STOPS) return null;

  const stops: TripStop[] = [];
  for (const raw of rawStops) {
    const m = STOP_RE.exec(raw);
    if (!m) return null;
    const [, country, y, mo, d, hh, mm, transit] = m;
    const date = `${y}-${mo}-${d}`;
    if (!isValidDate(date)) return null;
    const stop: TripStop = { country, date };
    if (hh !== undefined) {
      if (Number(hh) > 23 || Number(mm) > 59) return null;
      stop.time = `${hh}:${mm}`;
    }
    if (transit) stop.transit = true;
    stops.push(stop);
  }
  return { passport, stops };
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
