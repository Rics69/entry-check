import { describe, expect, it } from "vitest";
import { LEGAL_EN } from "@/content/legal/en";
import { LEGAL_RU } from "@/content/legal/ru";
import { LEGAL_DOCS } from "@/content/legal/types";
import { sampleTrip } from "@/content/sample-trips";
import { evaluateTrip } from "@/lib/rules/engine";
import { suggestZonesForHost } from "@/lib/rules/official";
import { formatTripPackPrice } from "@/lib/pricing";

describe("образцы маршрутов на лендинге", () => {
  const today = "2026-11-09";

  it.each(["ru", "en"] as const)("%s: все страны с данными и все три цвета статусов", (locale) => {
    const trip = sampleTrip(locale, today);
    const result = evaluateTrip(trip, { now: new Date(`${today}T00:00:00Z`) });
    expect(result.summary.unknown).toBe(0);
    expect(new Set(result.stops.map((s) => s.status))).toEqual(new Set(["green", "yellow", "red"]));
    // Окна подачи в образце — в будущем, а не «уже закрыто».
    for (const stop of result.stops) {
      for (const item of stop.extras) if (item.window) expect(item.window.state).toBe("upcoming");
    }
  });
});

describe("«Проверьте сайт»: подсказка официального портала", () => {
  it.each([
    ["thailand-tdac-online.com", ["TH"]],
    ["esta-usa-apply.org", ["US"]],
    ["vietnam-evisa.net", ["VN"]],
    ["uk-eta-application.com", ["GB"]],
    ["etias-europe.info", ["SCHENGEN"]],
    ["bali-arrival.com", ["ID"]],
  ])("%s → %j", (host, zones) => {
    expect(suggestZonesForHost(host)).toEqual(zones);
  });

  it("короткие ключи не срабатывают внутри слов", () => {
    expect(suggestZonesForHost("duke-music.com")).toEqual([]);
    expect(suggestZonesForHost("useful-travel.com")).toEqual([]);
  });
});

describe("цены Trip Pack", () => {
  it("рубли без копеек, евро с центами", () => {
    expect(formatTripPackPrice("ru").replace(/\s/g, " ")).toBe("490 ₽");
    expect(formatTripPackPrice("en")).toBe("€6.99");
  });
});

describe("юридические документы", () => {
  it("на обоих языках одинаковый набор документов и разделов", () => {
    for (const doc of LEGAL_DOCS) {
      expect(LEGAL_RU[doc].sections.length, doc).toBe(LEGAL_EN[doc].sections.length);
    }
  });
});
