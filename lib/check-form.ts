import type { Trip } from "@/lib/rules/types";
import { MAX_STOPS, isValidDate } from "@/lib/trip-codec";

/** Точка маршрута в форме — как её редактирует человек (пустые строки допустимы до проверки). */
export type StopDraft = {
  id: string;
  country: string;
  date: string;
  time: string;
  transit: boolean;
};

export type StopError = "country" | "date" | "past" | "far";
export type StopErrors = { country?: StopError; date?: StopError };

/** Насколько вперёд можно указать дату: дальше правила всё равно поменяются. */
export const MAX_YEARS_AHEAD = 2;

let counter = 0;
export function newStopId(): string {
  counter += 1;
  return `s${Date.now().toString(36)}${counter}`;
}

export function emptyStop(date = ""): StopDraft {
  return { id: newStopId(), country: "", date, time: "", transit: false };
}

/** Сегодняшняя дата по часам устройства: "2026-11-09". */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function maxDate(today: string): string {
  const [y, m, d] = today.split("-");
  return `${Number(y) + MAX_YEARS_AHEAD}-${m}-${d}`;
}

/** Ошибки по каждой точке. Пустой объект — всё заполнено верно. */
export function validateStops(stops: StopDraft[], today: string): Record<string, StopErrors> {
  const errors: Record<string, StopErrors> = {};
  const limit = maxDate(today);
  for (const stop of stops) {
    const e: StopErrors = {};
    if (!/^[A-Z]{2}$/.test(stop.country)) e.country = "country";
    if (!isValidDate(stop.date)) e.date = "date";
    else if (stop.date < today) e.date = "past";
    else if (stop.date > limit) e.date = "far";
    if (e.country || e.date) errors[stop.id] = e;
  }
  return errors;
}

/**
 * Форма → маршрут для движка и ссылки. Точки сортируются по дате и времени;
 * при равенстве сохраняется порядок ввода (пересадка утром, въезд вечером того же дня).
 */
export function draftsToTrip(passport: string, stops: StopDraft[]): Trip {
  const sorted = stops
    .map((stop, index) => ({ stop, index }))
    .sort((a, b) => {
      const ka = `${a.stop.date}T${a.stop.time || "99:99"}`;
      const kb = `${b.stop.date}T${b.stop.time || "99:99"}`;
      return ka === kb ? a.index - b.index : ka < kb ? -1 : 1;
    })
    .map(({ stop }) => stop);

  return {
    passport,
    stops: sorted.slice(0, MAX_STOPS).map((s) => ({
      country: s.country,
      date: s.date,
      ...(s.time ? { time: s.time } : {}),
      ...(s.transit ? { transit: true } : {}),
    })),
  };
}

export function tripToDrafts(trip: Trip): StopDraft[] {
  return trip.stops.map((s) => ({
    id: newStopId(),
    country: s.country,
    date: s.date,
    time: s.time ?? "",
    transit: Boolean(s.transit),
  }));
}
