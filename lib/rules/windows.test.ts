import { describe, expect, it } from "vitest";
import { addDays, calendarWindow, filingWindow, formatLocal, utcToZoned, zonedTimeToUtc } from "./windows";

describe("zonedTimeToUtc / utcToZoned", () => {
  it("Бангкок, UTC+7 без летнего времени", () => {
    expect(zonedTimeToUtc("2026-12-15", "09:00", "Asia/Bangkok").toISOString()).toBe("2026-12-15T02:00:00.000Z");
  });

  it("Индия, UTC+5:30 — получасовое смещение", () => {
    expect(zonedTimeToUtc("2026-12-15", "00:00", "Asia/Kolkata").toISOString()).toBe("2026-12-14T18:30:00.000Z");
  });

  it("Нью-Йорк до и после перехода на зимнее время (1 ноября 2026)", () => {
    expect(zonedTimeToUtc("2026-10-31", "12:00", "America/New_York").toISOString()).toBe("2026-10-31T16:00:00.000Z");
    expect(zonedTimeToUtc("2026-11-02", "12:00", "America/New_York").toISOString()).toBe("2026-11-02T17:00:00.000Z");
  });

  it("обратное преобразование в местное время", () => {
    expect(utcToZoned(new Date("2026-12-12T02:00:00Z"), "Asia/Bangkok")).toEqual({ date: "2026-12-12", time: "09:00" });
  });
});

describe("filingWindow: окно «за 72 часа до прилёта»", () => {
  const now = new Date("2026-11-08T12:00:00Z");

  it("известно время прилёта — окно открывается ровно за 72 часа по местному времени", () => {
    const w = filingWindow({ arrivalDate: "2026-12-15", arrivalTime: "09:00", timeZone: "Asia/Bangkok", hoursBefore: 72, now });
    expect(w.opensAt).toBe("2026-12-12T02:00:00.000Z");
    expect(w.remindAt).toBe(w.opensAt);
    expect(w.closesAt).toBe("2026-12-15T02:00:00.000Z");
    expect(w.exactTime).toBe(true);
    expect(utcToZoned(new Date(w.opensAt), "Asia/Bangkok")).toEqual({ date: "2026-12-12", time: "09:00" });
  });

  it("время неизвестно — напоминание в 09:00, когда окно точно открыто (Индия)", () => {
    const w = filingWindow({ arrivalDate: "2026-12-15", timeZone: "Asia/Kolkata", hoursBefore: 72, now });
    // Самое раннее открытие: 12 декабря 00:00 по Индии.
    expect(w.opensAt).toBe("2026-12-11T18:30:00.000Z");
    // Точно открыто к 12 декабря 23:59 → ближайшие 09:00 — 13 декабря.
    expect(utcToZoned(new Date(w.remindAt), "Asia/Kolkata")).toEqual({ date: "2026-12-13", time: "09:00" });
    expect(w.exactTime).toBe(false);
  });

  it("переход на летнее время между открытием окна и прилётом (Лондон, 29 марта 2026)", () => {
    const w = filingWindow({ arrivalDate: "2026-03-30", arrivalTime: "10:00", timeZone: "Europe/London", hoursBefore: 72, now });
    // 10:00 BST = 09:00 UTC; за 72 часа — 27 марта 09:00 UTC = 09:00 GMT.
    expect(w.opensAt).toBe("2026-03-27T09:00:00.000Z");
    expect(utcToZoned(new Date(w.opensAt), "Europe/London")).toEqual({ date: "2026-03-27", time: "09:00" });
  });

  it("состояние окна относительно текущего момента", () => {
    const input = { arrivalDate: "2026-12-15", arrivalTime: "09:00", timeZone: "Asia/Bangkok", hoursBefore: 72 };
    expect(filingWindow({ ...input, now: new Date("2026-12-12T01:59:00Z") }).state).toBe("upcoming");
    expect(filingWindow({ ...input, now: new Date("2026-12-13T00:00:00Z") }).state).toBe("open");
    expect(filingWindow({ ...input, now: new Date("2026-12-15T02:01:00Z") }).state).toBe("closed");
  });

  it("короткое окно без времени прилёта — не откладываем напоминание на утро", () => {
    const w = filingWindow({ arrivalDate: "2026-12-15", timeZone: "Asia/Bangkok", hoursBefore: 12, now });
    expect(new Date(w.remindAt).getTime()).toBeLessThan(new Date(w.closesAt).getTime());
  });
});

describe("calendarWindow: окно «3 календарных дня, включая день прилёта» (SG Arrival Card)", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("вечерний рейс: окно открывается в 00:00 за два дня, а не ровно за 72 часа", () => {
    const w = calendarWindow({ arrivalDate: "2026-06-30", arrivalTime: "21:00", timeZone: "Asia/Singapore", days: 3, now });
    expect(utcToZoned(new Date(w.opensAt), "Asia/Singapore")).toEqual({ date: "2026-06-28", time: "00:00" });
    expect(utcToZoned(new Date(w.remindAt), "Asia/Singapore")).toEqual({ date: "2026-06-28", time: "09:00" });
    expect(w).toMatchObject({ unit: "days", exactTime: true, closesAt: "2026-06-30T13:00:00.000Z" });
  });

  it("без времени прилёта начало окна всё равно точное", () => {
    const w = calendarWindow({ arrivalDate: "2026-06-30", timeZone: "Asia/Singapore", days: 3, now });
    expect(w.opensAt).toBe("2026-06-27T16:00:00.000Z");
    expect(w.exactTime).toBe(true);
  });

  it("окно в один день, прилёт рано утром — напоминаем в момент открытия", () => {
    const w = calendarWindow({ arrivalDate: "2026-06-30", arrivalTime: "06:00", timeZone: "Asia/Singapore", days: 1, now });
    expect(w.remindAt).toBe(w.opensAt);
  });
});

describe("форматирование", () => {
  it("дата и время в поясе страны на языке интерфейса", () => {
    const ru = formatLocal("2026-12-12T02:00:00.000Z", "ru", "Asia/Bangkok");
    expect(ru).toContain("12 декабря");
    expect(ru).toContain("09:00");
    const en = formatLocal("2026-12-12T02:00:00.000Z", "en", "Asia/Bangkok", false);
    expect(en).toBe("December 12");
  });

  it("addDays переходит через границы месяцев и лет", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
