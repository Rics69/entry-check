import type { Deps } from "@/lib/deps";
import { checklistEmail } from "@/lib/email/templates";
import { randomId } from "@/lib/ids";
import { consentTexts, parseConsent, parseTrip, ruleFingerprints, type Order, type OrderStatus } from "@/lib/order-data";
import { TRIP_PACK_PRICE } from "@/lib/pricing";
import { cancelReminders, planReminders, reminderLines, saveReminders, scheduleDueReminders } from "@/lib/reminders";
import { evaluateTrip } from "@/lib/rules/engine";
import type { Trip } from "@/lib/rules/types";

export * from "@/lib/order-data";

/**
 * Заказы Trip Pack. Логика не зависит от платёжной системы: и колбэк RollyPay, и тестовая оплата-заглушка
 * приходят в handlePaymentEvent.
 */

export async function getOrder(db: D1Database, id: string): Promise<Order | null> {
  return db.prepare("SELECT * FROM orders WHERE id = ?1").bind(id).first<Order>();
}

export async function getOrderByPayment(db: D1Database, paymentId: string): Promise<Order | null> {
  return db.prepare("SELECT * FROM orders WHERE payment_id = ?1").bind(paymentId).first<Order>();
}

export async function createOrder(
  deps: Deps,
  input: { email: string; locale: "ru" | "en"; trip: Trip; provider: string },
): Promise<Order> {
  const price = TRIP_PACK_PRICE[input.locale];
  const result = evaluateTrip(input.trip, { now: deps.now() });
  const createdAt = deps.now().toISOString();
  // Заказ создаётся только после обеих галочек (проверяет /api/orders), поэтому согласие = момент создания.
  const order: Order = {
    id: randomId(),
    payment_id: null,
    status: "created",
    email: input.email,
    locale: input.locale,
    trip_json: JSON.stringify(input.trip),
    amount: price.amount.toFixed(2),
    currency: price.currency,
    created_at: createdAt,
    paid_at: null,
    provider: input.provider,
    rules_snapshot: JSON.stringify(ruleFingerprints(result)),
    fulfilled_at: null,
    consent_at: createdAt,
    consent_text: JSON.stringify(consentTexts(input.locale)),
  };
  await deps.db
    .prepare(
      `INSERT INTO orders (id, payment_id, status, email, locale, trip_json, amount, currency, created_at, paid_at, provider, rules_snapshot, fulfilled_at, consent_at, consent_text)
       VALUES (?1, NULL, 'created', ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, ?9, NULL, ?10, ?11)`,
    )
    .bind(
      order.id,
      order.email,
      order.locale,
      order.trip_json,
      order.amount,
      order.currency,
      order.created_at,
      order.provider,
      order.rules_snapshot,
      order.consent_at,
      order.consent_text,
    )
    .run();
  return order;
}

export async function setPaymentId(db: D1Database, orderId: string, paymentId: string): Promise<void> {
  await db.prepare("UPDATE orders SET payment_id = ?1 WHERE id = ?2").bind(paymentId, orderId).run();
}

export type PaymentEvent = {
  paymentId: string;
  status: string;
  amount?: string;
  currency?: string;
  raw: string;
};

export type HandleResult = "unknown_order" | "mismatch" | "duplicate" | "paid" | "closed" | "reversed" | "ignored";

/**
 * Обработка статуса платежа. Идемпотентно: таблица payment_events с ключом (payment_id, status) —
 * повтор того же события ничего не меняет. Поздний paid после expired/canceled открывает заказ.
 * Письмо и напоминания — в fulfill(); если они упали, повторный колбэк доделает работу.
 */
export async function handlePaymentEvent(deps: Deps, event: PaymentEvent): Promise<HandleResult> {
  const order = await getOrderByPayment(deps.db, event.paymentId);
  if (!order) return "unknown_order";

  const amountMismatch = event.amount !== undefined && Number(event.amount) !== Number(order.amount);
  const currencyMismatch = event.currency !== undefined && event.currency.toUpperCase() !== order.currency;
  if (amountMismatch || currencyMismatch) return "mismatch";

  const inserted = await deps.db
    .prepare("INSERT OR IGNORE INTO payment_events (payment_id, status, received_at, raw) VALUES (?1, ?2, ?3, ?4)")
    .bind(event.paymentId, event.status, deps.now().toISOString(), event.raw)
    .run();
  const duplicate = (inserted.meta?.changes ?? 0) === 0;

  let result: HandleResult = duplicate ? "duplicate" : "ignored";
  if (!duplicate) result = await applyStatus(deps, order, event.status as OrderStatus);

  // Оплачен, но чек-лист не ушёл (сбой при прошлом колбэке) — доделываем даже на повторе.
  const fresh = await getOrder(deps.db, order.id);
  if (fresh?.status === "paid" && !fresh.fulfilled_at) await fulfill(deps, fresh);

  return result;
}

async function setStatus(deps: Deps, orderId: string, status: OrderStatus, paidAt?: string) {
  if (paidAt) {
    await deps.db.prepare("UPDATE orders SET status = ?1, paid_at = ?2 WHERE id = ?3").bind(status, paidAt, orderId).run();
  } else {
    await deps.db.prepare("UPDATE orders SET status = ?1 WHERE id = ?2").bind(status, orderId).run();
  }
}

async function applyStatus(deps: Deps, order: Order, status: OrderStatus): Promise<HandleResult> {
  switch (status) {
    case "paid":
      // Из created, canceled или expired (поздняя оплата). После возврата заказ не открываем.
      if (["created", "canceled", "expired"].includes(order.status)) {
        await setStatus(deps, order.id, "paid", deps.now().toISOString());
        await deps.db
          .prepare("INSERT INTO events (name, locale, ref, props, ts) VALUES ('order_paid', ?1, NULL, ?2, ?3)")
          .bind(order.locale, JSON.stringify({ provider: order.provider, currency: order.currency }), deps.now().toISOString())
          .run();
        return "paid";
      }
      return "ignored";
    case "canceled":
    case "expired":
      if (order.status === "created") {
        await setStatus(deps, order.id, status);
        return "closed";
      }
      return "ignored";
    case "refunded":
    case "chargeback":
      if (order.status === "paid") {
        await setStatus(deps, order.id, status);
        await cancelReminders(deps, order.id);
        return "reversed";
      }
      return "ignored";
    default:
      return "ignored";
  }
}

/** После оплаты: чек-лист на почту, напоминания в план, ближайшие — сразу в очередь. */
async function fulfill(deps: Deps, order: Order): Promise<void> {
  const trip = parseTrip(order);
  if (!trip) return;
  const locale = order.locale === "ru" ? "ru" : "en";
  const now = deps.now();
  const result = evaluateTrip(trip, { now });
  const plan = planReminders(order.id, trip, result, now);

  await saveReminders(deps, order.id, plan);
  const email = checklistEmail({
    locale,
    siteUrl: deps.siteUrl,
    orderId: order.id,
    trip,
    result,
    reminders: reminderLines(plan, locale),
    consent: parseConsent(order),
  });
  await deps.email.send({ to: order.email, ...email, idempotencyKey: `${order.id}-checklist` });
  await scheduleDueReminders(deps, order.id);
  await deps.db.prepare("UPDATE orders SET fulfilled_at = ?1 WHERE id = ?2").bind(now.toISOString(), order.id).run();
}
