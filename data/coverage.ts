import type { ZoneCode } from "@/lib/rules/types";
import { PASSPORTS } from "./countries";

/** Все зоны назначения MVP. */
export const ALL_ZONES: ZoneCode[] = [
  "TH", "VN", "ID", "TR", "AE", "EG", "LK", "MY", "IN", "CN",
  "GB", "SCHENGEN", "SG", "KR", "JP", "US",
];

/**
 * Охват: для каждой пары «паспорт → зона» обязано быть правило режима въезда.
 * Изначально у треков были свои списки стран (RU — 10 зон, EN — 11, всего 170 пар),
 * но в форме все страны доступны всем, поэтому охват расширен до полной матрицы 16 × 16 = 256 пар.
 * Треки по-прежнему задают, какие паспорта и страны популярны в каждой языковой версии.
 */
export const COVERAGE: Record<"ru" | "en", { passports: readonly string[]; zones: ZoneCode[] }> = {
  ru: { passports: PASSPORTS.ru, zones: ALL_ZONES },
  en: { passports: PASSPORTS.en, zones: ALL_ZONES },
};

export function coveragePairs(): { passport: string; zone: ZoneCode }[] {
  return Object.values(COVERAGE).flatMap(({ passports, zones }) =>
    passports.flatMap((passport) => zones.map((zone) => ({ passport, zone }))),
  );
}
