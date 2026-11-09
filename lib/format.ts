import { getCountry } from "@/data/countries";
import { DESTINATIONS } from "@/data/destinations";
import type { Requirement, ZoneCode } from "@/lib/rules/types";

/** Язык интерфейса → локаль Intl. */
export function intlLocale(locale: string): string {
  return locale === "ru" ? "ru-RU" : "en-GB";
}

/** Сбор: "150 000 IDR", "£20.00" → "£20". null — сбор не указан. */
export function formatFee(fee: Requirement["fee"], locale: string): string | null {
  if (!fee) return null;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: fee.currency,
    currencyDisplay: "symbol",
    maximumFractionDigits: Number.isInteger(fee.amount) ? 0 : 2,
  }).format(fee.amount);
}

/** "2026-12-15" → «15 декабря» / «15 December». С годом — для дат проверки. */
export function formatDay(date: string, locale: string, withYear = false): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function countryName(code: string, locale: string): string {
  const country = getCountry(code);
  return country ? country.name[locale === "ru" ? "ru" : "en"] : code;
}

export function zoneName(zone: ZoneCode, locale: string): string {
  return DESTINATIONS[zone].name[locale === "ru" ? "ru" : "en"];
}

/** Хост ссылки без www — показываем рядом с кнопкой «Официальный сайт», чтобы был виден госдомен. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
