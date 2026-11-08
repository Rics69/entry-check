import { describe, expect, it } from "vitest";
import { ALL_RULES } from "@/data/requirements";
import { evaluateTrip, ruleApplies, worstStatus } from "./engine";
import type { Requirement } from "./types";

const now = new Date("2026-11-08T12:00:00Z");
const ids = (items: { requirement: Requirement }[]) => items.map((i) => i.requirement.id);

describe("evaluateTrip", () => {
  it("RU: Таиланд → Вьетнам — безвиз и две карты прибытия с окнами", () => {
    const result = evaluateTrip(
      {
        passport: "RU",
        stops: [
          { country: "TH", date: "2026-12-15", time: "09:30" },
          { country: "VN", date: "2026-12-22" },
        ],
      },
      { now },
    );

    const [th, vn] = result.stops;
    expect(th.entry?.requirement.id).toBe("th-bilateral-30");
    expect(ids(th.extras)).toEqual(["th-tdac"]);
    expect(th.status).toBe("yellow");
    expect(th.extras[0].window?.opensAt).toBe("2026-12-12T02:30:00.000Z");
    expect(th.extras[0].window?.state).toBe("upcoming");

    expect(vn.entry?.requirement.id).toBe("vn-visa-exempt-45");
    expect(ids(vn.extras)).toEqual(["vn-dac"]);

    expect(result.summary).toMatchObject({ stops: 2, permits: 0, forms: 2, unknown: 0 });
    expect(result.overall).toBe("yellow");
  });

  it("US: Лондон → Париж → Рим — ETA в Великобритании, Шенген одной карточкой", () => {
    const result = evaluateTrip(
      {
        passport: "US",
        stops: [
          { country: "GB", date: "2026-12-15" },
          { country: "FR", date: "2026-12-20" },
          { country: "IT", date: "2026-12-24" },
        ],
      },
      { now },
    );

    expect(result.stops).toHaveLength(2);
    const [gb, schengen] = result.stops;
    expect(gb.entry?.requirement.id).toBe("gb-eta");
    expect(gb.status).toBe("red");
    expect(gb.entry?.applyBy).toBe("2026-12-08");

    expect(schengen.zone).toBe("SCHENGEN");
    expect(schengen.countries).toEqual(["FR", "IT"]);
    expect(schengen.stopIndexes).toEqual([1, 2]);
    expect(schengen.entry?.requirement.id).toBe("sch-visa-free-90");
    expect(ids(schengen.extras).sort()).toEqual(["sch-ees", "sch-etias-pending"]);
    expect(schengen.status).toBe("green");

    expect(result.summary.permits).toBe(1);
    expect(result.overall).toBe("red");
  });

  it("страна гражданства — ничего не нужно", () => {
    const result = evaluateTrip({ passport: "GB", stops: [{ country: "GB", date: "2026-12-15" }] }, { now });
    expect(result.stops[0]).toMatchObject({ home: true, status: "green", entry: null });
  });

  it("гражданин ЕС в Шенгене — свобода передвижения, без EES", () => {
    const result = evaluateTrip({ passport: "DE", stops: [{ country: "FR", date: "2026-12-15" }] }, { now });
    expect(result.stops[0].entry?.requirement.id).toBe("sch-eu-free-movement");
    expect(result.stops[0].extras).toEqual([]);
  });

  it("пересадка без выхода из аэропорта — въездные документы не нужны", () => {
    const result = evaluateTrip(
      { passport: "US", stops: [{ country: "SG", date: "2026-12-15", transit: true }] },
      { now },
    );
    const sg = result.stops[0];
    expect(sg).toMatchObject({ transit: true, status: "green", entry: null, extras: [] });
    expect(sg.transitNote?.ru).toContain("транзитной зоны");
  });

  it("пересадка в США — нужен ESTA, транзитной зоны нет", () => {
    const result = evaluateTrip(
      { passport: "GB", stops: [{ country: "US", date: "2026-12-15", transit: true }] },
      { now },
    );
    expect(result.stops[0].entry?.requirement.id).toBe("us-esta");
    expect(result.stops[0].status).toBe("red");
    expect(result.stops[0].transitNote?.ru).toContain("нет транзитной зоны");
  });

  it("пересадка в Шенгене и въезд в другую страну Шенгена — одна карточка с въездом", () => {
    const result = evaluateTrip(
      {
        passport: "US",
        stops: [
          { country: "DE", date: "2026-12-15", transit: true },
          { country: "IT", date: "2026-12-15" },
        ],
      },
      { now },
    );
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0]).toMatchObject({ transit: false, countries: ["DE", "IT"] });
    expect(result.stops[0].entry?.requirement.id).toBe("sch-visa-free-90");
  });

  it("временные режимы зависят от даты прилёта: K-ETA до и после 31.12.2026", () => {
    const before = evaluateTrip({ passport: "US", stops: [{ country: "KR", date: "2026-12-20" }] }, { now });
    expect(before.stops[0].entry?.requirement.id).toBe("kr-visa-free-90");
    expect(ids(before.stops[0].extras).sort()).toEqual(["kr-e-arrival", "kr-keta-exempt"]);

    const after = evaluateTrip({ passport: "US", stops: [{ country: "KR", date: "2027-01-10" }] }, { now });
    expect(after.stops[0].entry?.requirement.id).toBe("kr-keta");
    expect(after.stops[0].extras).toEqual([]);
  });

  it("правило закончилось и замены нет — честное «нет данных» со ссылкой на портал", () => {
    const result = evaluateTrip({ passport: "RU", stops: [{ country: "CN", date: "2028-01-10" }] }, { now });
    expect(result.stops[0]).toMatchObject({ status: "unknown", entry: null, portalUrl: "https://cs.mfa.gov.cn/" });
    expect(result.summary.unknown).toBe(1);
  });

  it("страна вне справочника — unknown без портала", () => {
    const result = evaluateTrip({ passport: "RU", stops: [{ country: "XX", date: "2026-12-15" }] }, { now });
    expect(result.stops[0]).toMatchObject({ status: "unknown", zone: null, portalUrl: null });
  });

  // Тестовые наборы не зависят от того, сколько правил уже сверено в data/requirements.
  const withVerification = (date: (id: string) => string | null) =>
    ALL_RULES.map((r) => ({ ...r, verifiedAt: date(r.id) }));
  const trip = { passport: "RU", stops: [{ country: "TH", date: "2026-12-15" }] };

  it("без черновиков (как в продакшне) непроверенный режим въезда — unknown", () => {
    const rules = withVerification((id) => (id === "th-bilateral-30" ? null : "2026-11-03"));
    const verifiedOnly = rules.filter((r) => r.verifiedAt !== null);
    const result = evaluateTrip(trip, { now, rules: verifiedOnly });
    expect(result.stops[0].status).toBe("unknown");
    expect(result.stops[0].entry).toBeNull();
  });

  it("черновик в карточке помечается, дата проверки — самая старая из правил", () => {
    const withDraft = withVerification((id) => (id === "th-tdac" ? null : "2026-11-03"));
    expect(evaluateTrip(trip, { now, rules: withDraft }).stops[0]).toMatchObject({ draft: true, verifiedAt: null });

    const allVerified = withVerification((id) => (id === "th-tdac" ? "2026-10-20" : "2026-11-03"));
    expect(evaluateTrip(trip, { now, rules: allVerified }).stops[0]).toMatchObject({ draft: false, verifiedAt: "2026-10-20" });
  });

  it("Вьетнам: Нидерланды и Польша — безвиз по Резолюции 229 до 14.08.2028, Узбекистан — e-Visa", () => {
    const nl = evaluateTrip({ passport: "NL", stops: [{ country: "VN", date: "2026-12-15" }] }, { now });
    expect(nl.stops[0].entry?.requirement.id).toBe("vn-visa-exempt-45-r229");
    const nlLate = evaluateTrip({ passport: "NL", stops: [{ country: "VN", date: "2028-09-01" }] }, { now });
    expect(nlLate.stops[0].status).toBe("unknown");

    const uz = evaluateTrip({ passport: "UZ", stops: [{ country: "VN", date: "2026-12-15" }] }, { now });
    expect(uz.stops[0].entry?.requirement.id).toBe("vn-evisa");
  });

  it("платная виза по прилёте — жёлтая, бесплатный штамп — зелёный", () => {
    const by = evaluateTrip({ passport: "BY", stops: [{ country: "TH", date: "2026-12-15" }] }, { now });
    expect(by.stops[0].entry?.status).toBe("yellow");
    expect(by.summary.payOnArrival).toBe(1);

    const ru = evaluateTrip({ passport: "RU", stops: [{ country: "AE", date: "2026-12-15" }] }, { now });
    expect(ru.stops[0].entry?.status).toBe("green");
    expect(ru.stops[0].status).toBe("green");
  });
});

describe("правки после сверки 09.11.2026", () => {
  const entryOf = (passport: string, country: string, date = "2026-12-15") =>
    evaluateTrip({ passport, stops: [{ country, date }] }, { now }).stops[0].entry?.requirement;

  it("Индонезия: KZ и BY — безвиз, KG — e-Visa C1, RU — по-прежнему VOA", () => {
    expect(entryOf("KZ", "ID")?.id).toBe("id-visa-free-30");
    expect(entryOf("BY", "ID")?.id).toBe("id-visa-free-30");
    expect(entryOf("KG", "ID")?.id).toBe("id-evisa-c1");
    expect(entryOf("RU", "ID")?.id).toBe("id-evoa");
  });

  it("Турция: KZ, UZ, KG — 90 дней, BY — 30", () => {
    expect(entryOf("KZ", "TR")?.stayLimitDays).toBe(90);
    expect(entryOf("BY", "TR")?.stayLimitDays).toBe(30);
  });

  it("Египет: сбор 30 $, KZ/UZ и KG — виза заранее", () => {
    expect(entryOf("RU", "EG")?.fee).toEqual({ amount: 30, currency: "USD" });
    expect(entryOf("KZ", "EG")?.kind).toBe("visa");
    expect(entryOf("KG", "EG")?.id).toBe("eg-visa-kg");
  });

  it("Шенген: Армения и Беларусь — сбор 35 €, остальные RU-трека — 90 €", () => {
    expect(entryOf("AM", "FR")?.fee?.amount).toBe(35);
    expect(entryOf("BY", "FR")?.fee?.amount).toBe(35);
    expect(entryOf("RU", "FR")?.fee?.amount).toBe(90);
  });

  it("Сингапур: GB и AU — 90 дней, окно карты прибытия — календарные дни", () => {
    expect(entryOf("GB", "SG")?.stayLimitDays).toBe(90);
    expect(entryOf("AU", "SG")?.stayLimitDays).toBe(90);
    expect(entryOf("CA", "SG")?.stayLimitDays).toBe(30);

    const sg = evaluateTrip({ passport: "US", stops: [{ country: "SG", date: "2026-12-30", time: "21:00" }] }, { now }).stops[0];
    const card = sg.extras.find((i) => i.requirement.id === "sg-arrival-card");
    expect(card?.window).toMatchObject({ unit: "days", opensAt: "2026-12-27T16:00:00.000Z" });
  });

  it("Корея с 2027: у Канады с K-ETA остаётся 180 дней", () => {
    expect(entryOf("CA", "KR", "2027-02-01")).toMatchObject({ id: "kr-keta-ca", stayLimitDays: 180 });
    expect(entryOf("US", "KR", "2027-02-01")).toMatchObject({ id: "kr-keta", stayLimitDays: 90 });
  });
});

describe("ruleApplies", () => {
  const rule = {
    appliesTo: { passports: "ALL", except: ["SG"] },
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
  } as unknown as Requirement;

  it("учитывает исключения и границы дат включительно", () => {
    expect(ruleApplies(rule, "US", "2026-01-01")).toBe(true);
    expect(ruleApplies(rule, "US", "2026-12-31")).toBe(true);
    expect(ruleApplies(rule, "US", "2027-01-01")).toBe(false);
    expect(ruleApplies(rule, "SG", "2026-06-01")).toBe(false);
  });
});

describe("worstStatus", () => {
  it("красный важнее «нет данных», «нет данных» важнее жёлтого", () => {
    expect(worstStatus(["green", "yellow", "unknown"])).toBe("unknown");
    expect(worstStatus(["unknown", "red"])).toBe("red");
    expect(worstStatus([])).toBe("green");
  });
});
