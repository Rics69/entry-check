import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { fingerprint } from "@/lib/ids";
import type { StopResult, TripResult } from "@/lib/rules/engine";
import type { Requirement, Trip } from "@/lib/rules/types";

export type OrderStatus = "created" | "paid" | "canceled" | "expired" | "refunded" | "chargeback";

/** Строка таблицы orders. */
export type Order = {
  id: string;
  payment_id: string | null;
  status: OrderStatus;
  email: string;
  locale: string;
  trip_json: string;
  amount: string;
  currency: string;
  created_at: string;
  paid_at: string | null;
  provider: string | null;
  rules_snapshot: string | null;
  fulfilled_at: string | null;
  /** Когда отмечены галочки согласия (совпадает с созданием заказа). */
  consent_at: string | null;
  /** Дословный текст галочек на языке заказа, JSON-массив строк. */
  consent_text: string | null;
};

/** Тексты галочек согласия — те же, что видит человек в форме оплаты. */
export function consentTexts(locale: "ru" | "en"): string[] {
  const { tripPack } = locale === "ru" ? ru : en;
  return [tripPack.consentImmediate, tripPack.consentReference];
}

export function parseConsent(order: Pick<Order, "consent_text">): string[] | null {
  if (!order.consent_text) return null;
  try {
    const value = JSON.parse(order.consent_text) as unknown;
    return Array.isArray(value) && value.every((v) => typeof v === "string") && value.length ? value : null;
  } catch {
    return null;
  }
}

export function parseTrip(order: Pick<Order, "trip_json">): Trip | null {
  try {
    const trip = JSON.parse(order.trip_json) as Trip;
    return trip && typeof trip.passport === "string" && Array.isArray(trip.stops) ? trip : null;
  } catch {
    return null;
  }
}

/** Отпечаток содержания правила без служебных полей: повторная сверка без изменений его не меняет. */
export function ruleFingerprint(rule: Requirement): string {
  const { verifiedAt: _v, draftNote: _d, source: _s, ...content } = rule;
  void _v;
  void _d;
  void _s;
  return fingerprint(JSON.stringify(content));
}

function itemsOf(stop: StopResult) {
  return [...(stop.entry ? [stop.entry] : []), ...stop.extras];
}

/** Отпечатки всех правил маршрута: { ruleId: fingerprint }. Сохраняются при покупке. */
export function ruleFingerprints(result: TripResult): Record<string, string> {
  const map: Record<string, string> = {};
  for (const stop of result.stops) for (const item of itemsOf(stop)) map[item.requirement.id] = ruleFingerprint(item.requirement);
  return map;
}

/** Точки маршрута, где после покупки появилось новое правило или изменилось существующее. */
export function changedStops(snapshot: Record<string, string>, result: TripResult): StopResult[] {
  return result.stops.filter((stop) =>
    itemsOf(stop).some((item) => snapshot[item.requirement.id] !== ruleFingerprint(item.requirement)),
  );
}

/** «t***@example.com» — для страницы поездки, которую могут переслать. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}
