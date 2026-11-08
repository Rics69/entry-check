import { describe, expect, it } from "vitest";
import type { Trip } from "@/lib/rules/types";
import { decodeTrip, encodeTrip, MAX_STOPS } from "./trip-codec";

const trip: Trip = {
  passport: "RU",
  stops: [
    { country: "TH", date: "2026-12-15" },
    { country: "VN", date: "2026-12-22", time: "09:30" },
    { country: "SG", date: "2026-12-30", transit: true },
  ],
};

describe("trip-codec", () => {
  it("кодирует в короткую строку без символов, требующих экранирования", () => {
    const encoded = encodeTrip(trip);
    expect(encoded).toBe("1.RU.TH20261215.VN202612220930.SG20261230t");
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it("декодирует обратно без потерь", () => {
    expect(decodeTrip(encodeTrip(trip))).toEqual(trip);
  });

  it.each([
    ["пустая строка", ""],
    ["null", null],
    ["другая версия", "2.RU.TH20261215"],
    ["нет точек маршрута", "1.RU"],
    ["паспорт строчными", "1.ru.TH20261215"],
    ["страна строчными", "1.RU.th20261215"],
    ["несуществующая дата", "1.RU.TH20260230"],
    ["время 24:00", "1.RU.TH202612152400"],
    ["лишние символы", "1.RU.TH20261215x"],
    ["слишком много точек", `1.RU${".TH20261215".repeat(MAX_STOPS + 1)}`],
  ])("отклоняет: %s", (_label, value) => {
    expect(decodeTrip(value)).toBeNull();
  });
});
