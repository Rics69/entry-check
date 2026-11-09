import type { Locale } from "@/i18n/routing";
import type { Trip } from "@/lib/rules/types";
import { addDays } from "@/lib/rules/windows";

/**
 * Примерные маршруты для «живой карточки» и «образца результата» на лендинге.
 * Считаются настоящим движком по сверенным правилам. Даты — от дня сборки,
 * чтобы окна подачи в образце были в будущем.
 *
 * RU: паспорт РФ, Дубай → Гоа → Пхукет — зелёный, красный, жёлтый.
 * EN: паспорт США, Лондон → Париж → Бангкок — красный, зелёный, жёлтый.
 */
export function sampleTrip(locale: Locale, today: string): Trip {
  const start = addDays(today, 30);
  if (locale === "ru") {
    return {
      passport: "RU",
      stops: [
        { country: "AE", date: start, time: "06:40" },
        { country: "IN", date: addDays(start, 5), time: "14:20" },
        { country: "TH", date: addDays(start, 16), time: "09:30" },
      ],
    };
  }
  return {
    passport: "US",
    stops: [
      { country: "GB", date: start, time: "07:05" },
      { country: "FR", date: addDays(start, 5), time: "11:15" },
      { country: "TH", date: addDays(start, 12), time: "09:30" },
    ],
  };
}

/** Сегодняшняя дата UTC "YYYY-MM-DD" — точка отсчёта для образца при статической сборке. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
