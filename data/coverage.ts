import type { ZoneCode } from "@/lib/rules/types";
import { PASSPORTS } from "./countries";

/**
 * Охват MVP из плана: для каждой пары «паспорт → зона» обязано быть правило режима въезда.
 * RU: 6 паспортов × 10 зон = 60 пар. EN: 10 паспортов × 11 зон = 110 пар.
 */
export const COVERAGE: Record<"ru" | "en", { passports: readonly string[]; zones: ZoneCode[] }> = {
  ru: {
    passports: PASSPORTS.ru,
    zones: ["TH", "VN", "ID", "TR", "AE", "EG", "LK", "MY", "IN", "CN"],
  },
  en: {
    passports: PASSPORTS.en,
    zones: ["GB", "SCHENGEN", "TH", "VN", "ID", "MY", "SG", "IN", "KR", "JP", "US"],
  },
};

export function coveragePairs(): { passport: string; zone: ZoneCode }[] {
  return Object.values(COVERAGE).flatMap(({ passports, zones }) =>
    passports.flatMap((passport) => zones.map((zone) => ({ passport, zone }))),
  );
}
