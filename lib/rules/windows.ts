/**
 * Окна подачи с часовыми поясами.
 * Всё считаем в UTC-мгновениях, а показываем в поясе страны назначения:
 * «откроется 12 декабря в 09:00 по местному времени».
 * Без зависимостей — только Intl, который есть и в браузере, и в Workers.
 */

const HOUR = 3_600_000;

/** Сколько миллисекунд пояс `timeZone` опережает UTC в момент `utcMs`. */
export function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Местные дата "YYYY-MM-DD" и время "HH:MM" в поясе → UTC-мгновение. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let utc = naive - timeZoneOffsetMs(naive, timeZone);
  // Второй проход уточняет смещение рядом с переходом на летнее время.
  const corrected = naive - timeZoneOffsetMs(utc, timeZone);
  if (corrected !== utc) utc = corrected;
  return new Date(utc);
}

/** UTC-мгновение → местные дата и время в поясе. */
export function utcToZoned(at: Date, timeZone: string): { date: string; time: string } {
  const local = new Date(at.getTime() + timeZoneOffsetMs(at.getTime(), timeZone));
  const iso = local.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export type WindowState = "upcoming" | "open" | "closed";

export type FilingWindow = {
  timeZone: string;
  /** "hours" — за N часов до прилёта; "days" — N календарных дней, включая день прилёта. */
  unit: "hours" | "days";
  /** Самый ранний момент, когда окно может открыться (UTC, ISO). */
  opensAt: string;
  /** Когда напомнить: окно точно открыто, по возможности в 09:00 по местному времени. */
  remindAt: string;
  /** Прилёт (если время неизвестно — конец дня прилёта). */
  closesAt: string;
  /** opensAt — точный момент. false — время прилёта неизвестно и opensAt оценён по началу дня. */
  exactTime: boolean;
  state: WindowState;
};

export type WindowInput = {
  /** Дата прилёта "YYYY-MM-DD" по местному времени. */
  arrivalDate: string;
  /** Время прилёта "HH:MM" по местному времени, если известно. */
  arrivalTime?: string;
  timeZone: string;
  hoursBefore: number;
  now: Date;
};

const REMIND_LOCAL_TIME = "09:00";

/**
 * Окно «не раньше чем за N часов до прилёта».
 *
 * Время прилёта известно: окно открывается ровно за N часов, напоминаем в момент открытия.
 * Неизвестно: окно открывается где-то в течение дня (дата прилёта − N часов). Напоминаем,
 * когда оно точно открыто при любом времени прилёта, и сдвигаем на 09:00 по местному времени,
 * если до прилёта ещё остаётся время.
 */
export function filingWindow(input: WindowInput): FilingWindow {
  const { arrivalDate, arrivalTime, timeZone, hoursBefore, now } = input;
  const span = hoursBefore * HOUR;

  let opens: number;
  let remind: number;
  let closes: number;

  if (arrivalTime) {
    const arrival = zonedTimeToUtc(arrivalDate, arrivalTime, timeZone).getTime();
    opens = arrival - span;
    remind = opens;
    closes = arrival;
  } else {
    const dayStart = zonedTimeToUtc(arrivalDate, "00:00", timeZone).getTime();
    const dayEnd = zonedTimeToUtc(arrivalDate, "23:59", timeZone).getTime();
    opens = dayStart - span;
    closes = dayEnd;
    const surelyOpen = dayEnd - span;
    remind = nextLocalTime(surelyOpen, REMIND_LOCAL_TIME, timeZone);
    // Окно короче суток или 09:00 уже после начала дня прилёта — не откладываем.
    if (remind >= dayStart) remind = surelyOpen;
  }

  return buildWindow({ unit: "hours", timeZone, opens, remind, closes, exactTime: Boolean(arrivalTime), now });
}

export type CalendarWindowInput = Omit<WindowInput, "hoursBefore"> & { days: number };

/**
 * Окно «N календарных дней, включая день прилёта» по времени страны (SG Arrival Card).
 * Открывается в 00:00 местного времени за N − 1 дней до даты прилёта — независимо от времени рейса.
 */
export function calendarWindow(input: CalendarWindowInput): FilingWindow {
  const { arrivalDate, arrivalTime, timeZone, days, now } = input;
  const openDate = addDays(arrivalDate, -(days - 1));
  const opens = zonedTimeToUtc(openDate, "00:00", timeZone).getTime();
  const closes = zonedTimeToUtc(arrivalDate, arrivalTime ?? "23:59", timeZone).getTime();
  let remind = zonedTimeToUtc(openDate, REMIND_LOCAL_TIME, timeZone).getTime();
  if (remind >= closes) remind = opens;

  return buildWindow({ unit: "days", timeZone, opens, remind, closes, exactTime: true, now });
}

function buildWindow(w: {
  unit: FilingWindow["unit"];
  timeZone: string;
  opens: number;
  remind: number;
  closes: number;
  exactTime: boolean;
  now: Date;
}): FilingWindow {
  const t = w.now.getTime();
  return {
    timeZone: w.timeZone,
    unit: w.unit,
    opensAt: new Date(w.opens).toISOString(),
    remindAt: new Date(w.remind).toISOString(),
    closesAt: new Date(w.closes).toISOString(),
    exactTime: w.exactTime,
    state: t < w.opens ? "upcoming" : t <= w.closes ? "open" : "closed",
  };
}

/** Ближайшее мгновение не раньше `fromUtc`, когда по местному времени наступает `time`. */
function nextLocalTime(fromUtc: number, time: string, timeZone: string): number {
  const { date } = utcToZoned(new Date(fromUtc), timeZone);
  const sameDay = zonedTimeToUtc(date, time, timeZone).getTime();
  if (sameDay >= fromUtc) return sameDay;
  return zonedTimeToUtc(addDays(date, 1), time, timeZone).getTime();
}

/** "YYYY-MM-DD" + n дней. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** «12 декабря в 09:00» в поясе страны, на языке интерфейса. */
export function formatLocal(
  iso: string,
  locale: string,
  timeZone: string,
  withTime = true,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "long",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
  }).format(new Date(iso));
}
