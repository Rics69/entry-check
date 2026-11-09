import type { Locale } from "@/i18n/routing";

/**
 * Цена Trip Pack по трекам: рубли для СНГ (СБП и карты РФ), евро для остального мира
 * (международные карты в RollyPay работают в EUR). Одно место для лендинга и /api/orders.
 */
export const TRIP_PACK_PRICE: Record<Locale, { amount: number; currency: "RUB" | "EUR" }> = {
  ru: { amount: 490, currency: "RUB" },
  en: { amount: 6.99, currency: "EUR" },
};

export function formatTripPackPrice(locale: Locale): string {
  const { amount, currency } = TRIP_PACK_PRICE[locale];
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
