import { requestDeps } from "@/lib/deps";
import { changedStops, getOrder, parseTrip, type Order } from "@/lib/orders";
import { evaluateTrip, type TripResult } from "@/lib/rules/engine";
import type { Trip } from "@/lib/rules/types";

export type PaidTripView = {
  order: Order;
  trip: Trip;
  result: TripResult;
  /** Ключи stopIndexes точек, где правила изменились после покупки. */
  changed: Set<string>;
  reminders: { kind: string; send_at: string; status: string; payload: string | null }[];
};

const ORDER_ID = /^[0-9a-z]{20}$/;

/** Оплаченная поездка для /trip/[orderId] и версии для печати. null — заказа нет (404). */
export async function loadPaidTrip(orderId: string): Promise<PaidTripView | null> {
  if (!ORDER_ID.test(orderId)) return null;
  const deps = await requestDeps();
  const order = await getOrder(deps.db, orderId);
  const trip = order ? parseTrip(order) : null;
  if (!order || !trip) return null;

  // Пересчитываем по актуальным правилам на каждый запрос — это и есть «повторная проверка».
  const result = evaluateTrip(trip, { now: deps.now() });
  const snapshot = JSON.parse(order.rules_snapshot ?? "{}") as Record<string, string>;
  const changed = new Set(changedStops(snapshot, result).map((s) => s.stopIndexes.join("-")));
  const { results: reminders } = await deps.db
    .prepare("SELECT kind, send_at, status, payload FROM reminders WHERE order_id = ?1 AND kind IN ('window_open', 'recheck_72h') ORDER BY send_at")
    .bind(order.id)
    .all<PaidTripView["reminders"][number]>();

  return { order, trip, result, changed, reminders };
}
