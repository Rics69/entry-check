import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { coveragePairs } from "@/data/coverage";
import { COUNTRIES } from "@/data/countries";
import { DESTINATIONS } from "@/data/destinations";
import OFFICIAL_DOMAINS from "@/data/official-domains.json";
import { ALL_RULES } from "@/data/requirements";
import { evaluateTrip, isEntryKind, ruleApplies } from "@/lib/rules/engine";
import { findOfficialDomain, isOfficialUrlFor } from "@/lib/rules/official";
import type { Requirement, ZoneCode } from "@/lib/rules/types";
import { validateRequirement } from "@/lib/rules/validate";

const RULES_DIR = join(process.cwd(), "data", "requirements");
const STALE_DAYS = 30;
/** Даты прилёта, на которые охват обязан быть полным. */
const REFERENCE_DATES = ["2026-12-15", "2027-03-01"];

/** Страна, через которую проверяем зону: для Шенгена — Франция. */
const countryOfZone = (zone: ZoneCode) => (zone === "SCHENGEN" ? "FR" : zone);

describe("файлы правил", () => {
  const files = readdirSync(RULES_DIR).filter((f) => f.endsWith(".json"));

  it("каждый файл подключён в data/requirements/index.ts", () => {
    const fromFiles = files.flatMap((f) => JSON.parse(readFileSync(join(RULES_DIR, f), "utf8")) as Requirement[]);
    expect(ALL_RULES.map((r) => r.id).sort()).toEqual(fromFiles.map((r) => r.id).sort());
  });

  it("в файле <ЗОНА>.json только правила этой зоны", () => {
    for (const file of files) {
      const zone = file.replace(".json", "");
      const rules = JSON.parse(readFileSync(join(RULES_DIR, file), "utf8")) as Requirement[];
      for (const rule of rules) expect(rule.destination, `${file}: ${rule.id}`).toBe(zone);
    }
  });

  it("есть файл для каждой зоны назначения", () => {
    expect(files.map((f) => f.replace(".json", "")).sort()).toEqual(Object.keys(DESTINATIONS).sort());
  });
});

describe("структура правил", () => {
  it.each(ALL_RULES.map((r) => [r.id, r] as const))("%s", (_id, rule) => {
    expect(validateRequirement(rule)).toEqual([]);
  });

  it("id уникальны и начинаются с кода зоны", () => {
    const ids = ALL_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const rule of ALL_RULES) {
      const prefix = rule.destination === "SCHENGEN" ? "sch" : rule.destination.toLowerCase();
      expect(rule.id.startsWith(`${prefix}-`), rule.id).toBe(true);
    }
  });
});

describe("охват MVP", () => {
  const pairs = coveragePairs();

  it("256 пар «паспорт → зона»: все 16 паспортов × 16 зон", () => {
    expect(pairs).toHaveLength(256);
  });

  /**
   * На каждую дату у пары должен быть известен режим въезда. Единственное допустимое исключение —
   * правило с явной датой окончания (например, временный безвиз Китая до 31.12.2026): после неё
   * движок честно говорит «нет данных», пока правило не продлят.
   */
  it.each(REFERENCE_DATES)("на %s у каждой пары известен режим въезда", (date) => {
    const missing = pairs.filter(({ passport, zone }) => {
      const result = evaluateTrip(
        { passport, stops: [{ country: countryOfZone(zone), date }] },
        { now: new Date("2026-11-08T00:00:00Z"), rules: ALL_RULES },
      );
      if (result.stops[0].status !== "unknown") return false;
      const expired = ALL_RULES.some(
        (r) =>
          r.destination === zone &&
          isEntryKind(r.kind) &&
          r.validUntil !== undefined &&
          r.validUntil < date &&
          ruleApplies({ ...r, validFrom: undefined, validUntil: undefined }, passport, date),
      );
      return !expired;
    });
    expect(missing.map((p) => `${p.passport}→${p.zone}`)).toEqual([]);
  });

  it.each(REFERENCE_DATES)("на %s режим въезда для пары ровно один", (date) => {
    const conflicts = pairs.flatMap(({ passport, zone }) => {
      const entry = ALL_RULES.filter(
        (r) => r.destination === zone && isEntryKind(r.kind) && ruleApplies(r, passport, date),
      );
      return entry.length > 1 ? [`${passport}→${zone}: ${entry.map((r) => r.id).join(", ")}`] : [];
    });
    expect(conflicts).toEqual([]);
  });
});

describe("официальные ссылки", () => {
  it.each(ALL_RULES.map((r) => [r.id, r] as const))("%s ведёт на госдомен своей зоны", (_id, rule) => {
    expect(isOfficialUrlFor(rule.officialUrl, rule.destination), rule.officialUrl).toBe(true);
  });

  it("порталы зон — тоже госдомены", () => {
    for (const destination of Object.values(DESTINATIONS)) {
      expect(isOfficialUrlFor(destination.portalUrl, destination.code), destination.portalUrl).toBe(true);
    }
  });

  it("список госдоменов описывает только известные зоны", () => {
    expect(Object.keys(OFFICIAL_DOMAINS).sort()).toEqual(Object.keys(DESTINATIONS).sort());
  });

  it("сверка домена для блока «Проверьте сайт»", () => {
    expect(findOfficialDomain("https://tdac.immigration.go.th/arrival")?.zone).toBe("TH");
    expect(findOfficialDomain("www.gov.uk/eta")?.zone).toBe("GB");
    expect(findOfficialDomain("esta.cbp.dhs.gov")?.zone).toBe("US");
    // Похожие, но не официальные адреса.
    expect(findOfficialDomain("https://tdac-immigration.go.th.com/")).toBeNull();
    expect(findOfficialDomain("https://thailand-tdac.com/")).toBeNull();
    expect(findOfficialDomain("https://fakegov.uk/")).toBeNull();
    expect(findOfficialDomain("не ссылка")).toBeNull();
  });
});

describe("справочник стран", () => {
  it("коды уникальны и у каждой страны есть названия на двух языках", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.name.ru && country.name.en, country.code).toBeTruthy();
    }
  });

  it("в Шенгене 29 стран", () => {
    expect(COUNTRIES.filter((c) => c.zone === "SCHENGEN")).toHaveLength(29);
  });
});

describe("черновики в продакшне", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("в продакшн-сборке движок не видит непроверенных правил", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const data = await import("@/data/requirements");
    expect(data.INCLUDE_DRAFTS).toBe(false);
    expect(data.RULES.every((r) => r.verifiedAt !== null)).toBe(true);
  });

  it("для закрытого превью черновики включаются явно", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_INCLUDE_DRAFT_RULES", "true");
    vi.resetModules();
    const data = await import("@/data/requirements");
    expect(data.INCLUDE_DRAFTS).toBe(true);
    expect(data.RULES).toHaveLength(data.ALL_RULES.length);
  });
});

describe("свежесть проверки", () => {
  it(`правила проверены не позже ${STALE_DAYS} дней назад (предупреждение, не ошибка)`, () => {
    const today = Date.now();
    const stale = ALL_RULES.filter(
      (r) => r.verifiedAt !== null && (today - Date.parse(r.verifiedAt)) / 86_400_000 > STALE_DAYS,
    );
    const drafts = ALL_RULES.filter((r) => r.verifiedAt === null);
    if (stale.length) console.warn(`⚠ Устарели (> ${STALE_DAYS} дней): ${stale.map((r) => r.id).join(", ")}`);
    if (drafts.length) console.warn(`⚠ Черновики без проверки: ${drafts.length} из ${ALL_RULES.length}. Подробно: npm run rules:report`);
    expect(true).toBe(true);
  });
});
