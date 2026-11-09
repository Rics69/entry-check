import { describe, expect, it } from "vitest";
import { decodeTrip, encodeTrip } from "@/lib/trip-codec";
import { draftsToTrip, localToday, maxDate, tripToDrafts, validateStops, type StopDraft } from "./check-form";

const draft = (p: Partial<StopDraft>): StopDraft => ({ id: p.id ?? Math.random().toString(36), country: "", date: "", time: "", transit: false, ...p });

describe("validateStops", () => {
  const today = "2026-11-09";

  it("требует страну и дату", () => {
    const errors = validateStops([draft({ id: "a" })], today);
    expect(errors.a).toEqual({ country: "country", date: "date" });
  });

  it("не принимает прошедшие и слишком далёкие даты", () => {
    const errors = validateStops(
      [draft({ id: "past", country: "TH", date: "2026-11-08" }), draft({ id: "far", country: "TH", date: "2028-11-10" })],
      today,
    );
    expect(errors.past?.date).toBe("past");
    expect(errors.far?.date).toBe("far");
  });

  it("сегодня и ровно через 2 года — можно", () => {
    expect(validateStops([draft({ country: "TH", date: today }), draft({ country: "VN", date: maxDate(today) })], today)).toEqual({});
  });
});

describe("draftsToTrip", () => {
  it("сортирует по дате и времени, равные — в порядке ввода", () => {
    const trip = draftsToTrip("RU", [
      draft({ country: "VN", date: "2026-12-22" }),
      draft({ country: "SG", date: "2026-12-15", time: "07:00", transit: true }),
      draft({ country: "TH", date: "2026-12-15", time: "21:30" }),
      draft({ country: "MY", date: "2026-12-15" }),
    ]);
    expect(trip.stops.map((s) => s.country)).toEqual(["SG", "TH", "MY", "VN"]);
    expect(trip.stops[0]).toEqual({ country: "SG", date: "2026-12-15", time: "07:00", transit: true });
    expect(trip.stops[2]).toEqual({ country: "MY", date: "2026-12-15" });
  });

  it("форма → ссылка → форма без потерь", () => {
    const trip = draftsToTrip("US", [draft({ country: "GB", date: "2026-12-15", time: "07:05" }), draft({ country: "FR", date: "2026-12-20" })]);
    const back = tripToDrafts(decodeTrip(encodeTrip(trip))!);
    expect(draftsToTrip("US", back)).toEqual(trip);
  });
});

describe("localToday", () => {
  it("берёт дату по часам устройства", () => {
    expect(localToday(new Date(2026, 10, 9, 23, 59))).toBe("2026-11-09");
  });
});
