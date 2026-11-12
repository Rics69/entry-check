import { DESTINATIONS } from "@/data/destinations";
import { RULES } from "@/data/requirements";
import type { Deps } from "@/lib/deps";
import { fingerprint } from "@/lib/ids";
import { recheckEmail, rulesChangedEmail, windowOpenEmail, type ReminderLine } from "@/lib/email/templates";
import { changedStops, parseTrip, ruleFingerprints, type Order } from "@/lib/order-data";
import { evaluateTrip, zoneOf, type TripResult } from "@/lib/rules/engine";
import type { Trip } from "@/lib/rules/types";
import { zonedTimeToUtc } from "@/lib/rules/windows";

/**
 * Напоминания Trip Pack.
 * Resend умеет откладывать письма максимум на 30 дней, поэтому: если до отправки меньше SCHEDULE_HORIZON_DAYS —
 * ставим письмо в очередь сразу; иначе — строка в reminders со статусом pending, и ежедневный cron
 * поставит его, когда срок подойдёт.
 */

export const SCHEDULE_HORIZON_DAYS = 29;
const DAY = 86_400_000;
const HOUR = 3_600_000;

export type ReminderKind = "window_open" | "recheck_72h";
export type PlannedReminder = { id: string; kind: ReminderKind; sendAt: string; payload: { ruleId?: string; stopIndex: number } };

/** Что и когда напомнить по оплаченной поездке. Прошедшие моменты пропускаем — их покрывает чек-лист. */
export function planReminders(orderId: string, trip: Trip, result: TripResult, now: Date): PlannedReminder[] {
  const plan: PlannedReminder[] = [];

  result.stops.forEach((stop, stopIndex) => {
    for (const item of stop.extras) {
      if (!item.window || new Date(item.window.remindAt) <= now) continue;
      plan.push({
        id: `${orderId}-window-${item.requirement.id}-${stopIndex}`,
        kind: "window_open",
        sendAt: item.window.remindAt,
        payload: { ruleId: item.requirement.id, stopIndex },
      });
    }
  });

  // Повторная проверка — за 72 часа до первого прилёта (по местному времени первой страны).
  const first = trip.stops[0];
  if (first) {
    const zone = zoneOf(first.country);
    const timeZone = zone ? DESTINATIONS[zone].timeZone : "UTC";
    const arrival = zonedTimeToUtc(first.date, first.time ?? "09:00", timeZone).getTime();
    const sendAt = new Date(arrival - 72 * HOUR);
    if (sendAt > now) {
      plan.push({ id: `${orderId}-recheck`, kind: "recheck_72h", sendAt: sendAt.toISOString(), payload: { stopIndex: 0 } });
    }
  }

  return plan.sort((a, b) => a.sendAt.localeCompare(b.sendAt));
}

export function reminderLines(plan: PlannedReminder[], locale: "ru" | "en"): ReminderLine[] {
  return plan.map((r) => ({
    kind: r.kind,
    sendAt: r.sendAt,
    ruleName: r.payload.ruleId ? RULES.find((rule) => rule.id === r.payload.ruleId)?.name[locale] : undefined,
  }));
}

/** Сохраняем план; повторный вызов ничего не дублирует (id детерминированы). */
export async function saveReminders(deps: Deps, orderId: string, plan: PlannedReminder[]): Promise<void> {
  for (const r of plan) {
    await deps.db
      .prepare(
        `INSERT OR IGNORE INTO reminders (id, order_id, kind, send_at, resend_id, status, payload)
         VALUES (?1, ?2, ?3, ?4, NULL, 'pending', ?5)`,
      )
      .bind(r.id, orderId, r.kind, r.sendAt, JSON.stringify(r.payload))
      .run();
  }
}

type ReminderRow = { id: string; order_id: string; kind: ReminderKind; send_at: string; payload: string | null };

/** Ставит в очередь письма, до отправки которых меньше горизонта. Возвращает, сколько поставлено. */
export async function scheduleDueReminders(deps: Deps, orderId?: string): Promise<number> {
  const horizon = new Date(deps.now().getTime() + SCHEDULE_HORIZON_DAYS * DAY).toISOString();
  const query = orderId
    ? deps.db
        .prepare("SELECT id, order_id, kind, send_at, payload FROM reminders WHERE status = 'pending' AND send_at <= ?1 AND order_id = ?2")
        .bind(horizon, orderId)
    : deps.db.prepare("SELECT id, order_id, kind, send_at, payload FROM reminders WHERE status = 'pending' AND send_at <= ?1").bind(horizon);
  const { results } = await query.all<ReminderRow>();

  let scheduled = 0;
  for (const row of results) {
    const order = await deps.db.prepare("SELECT * FROM orders WHERE id = ?1").bind(row.order_id).first<Order>();
    if (!order || order.status !== "paid") {
      await deps.db.prepare("UPDATE reminders SET status = 'canceled' WHERE id = ?1").bind(row.id).run();
      continue;
    }
    const email = renderReminder(deps, order, row);
    if (!email) {
      await deps.db.prepare("UPDATE reminders SET status = 'canceled' WHERE id = ?1").bind(row.id).run();
      continue;
    }
    // Время в прошлом (cron опоздал) — отправляем сразу.
    const sendAt = new Date(row.send_at) > deps.now() ? row.send_at : undefined;
    const { id } = await deps.email.send({ to: order.email, ...email, scheduledAt: sendAt, idempotencyKey: row.id });
    await deps.db.prepare("UPDATE reminders SET status = 'scheduled', resend_id = ?1 WHERE id = ?2").bind(id, row.id).run();
    scheduled += 1;
  }
  return scheduled;
}

function renderReminder(deps: Deps, order: Order, row: ReminderRow) {
  const trip = parseTrip(order);
  const locale = order.locale === "ru" ? "ru" : "en";
  const payload = row.payload ? (JSON.parse(row.payload) as PlannedReminder["payload"]) : { stopIndex: 0 };
  const stop = trip?.stops[payload.stopIndex];
  if (!trip || !stop) return null;
  const base = { locale, siteUrl: deps.siteUrl, orderId: order.id, country: stop.country, arrivalDate: stop.date } as const;

  if (row.kind === "recheck_72h") return recheckEmail(base);
  const rule = RULES.find((r) => r.id === payload.ruleId);
  return rule ? windowOpenEmail({ ...base, rule }) : null;
}

/** Возврат или chargeback: снимаем всё, что ещё не отправлено. */
export async function cancelReminders(deps: Deps, orderId: string): Promise<void> {
  const { results } = await deps.db
    .prepare("SELECT id, resend_id, status FROM reminders WHERE order_id = ?1 AND status IN ('pending', 'scheduled')")
    .bind(orderId)
    .all<{ id: string; resend_id: string | null; status: string }>();
  for (const row of results) {
    if (row.status === "scheduled" && row.resend_id) await deps.email.cancel(row.resend_id);
    await deps.db.prepare("UPDATE reminders SET status = 'canceled' WHERE id = ?1").bind(row.id).run();
  }
}

/**
 * Письмо «правила изменились»: для оплаченных поездок, которые ещё впереди, сравниваем отпечатки
 * правил с сохранёнными при покупке.
 */
export async function notifyRuleChanges(deps: Deps): Promise<number> {
  const today = deps.now().toISOString().slice(0, 10);
  const { results } = await deps.db
    .prepare("SELECT * FROM orders WHERE status = 'paid' AND rules_snapshot IS NOT NULL LIMIT 500")
    .all<Order>();

  let sent = 0;
  for (const order of results) {
    const trip = parseTrip(order);
    if (!trip || (trip.stops.at(-1)?.date ?? "") < today) continue;
    const result = evaluateTrip(trip, { now: deps.now() });
    const snapshot = JSON.parse(order.rules_snapshot ?? "{}") as Record<string, string>;
    const changed = changedStops(snapshot, result);
    if (!changed.length) continue;

    // Снимок на момент покупки не трогаем — по нему страница поездки помечает изменённые карточки.
    // Факт письма — строка в reminders с отпечатком текущего набора правил: одно письмо на каждое изменение.
    const countries = changed.flatMap((s) => s.countries);
    const marker = `${order.id}-changed-${fingerprint(JSON.stringify(ruleFingerprints(result)))}`;
    const inserted = await deps.db
      .prepare(
        `INSERT OR IGNORE INTO reminders (id, order_id, kind, send_at, resend_id, status, payload)
         VALUES (?1, ?2, 'rules_changed', ?3, NULL, 'sent', ?4)`,
      )
      .bind(marker, order.id, deps.now().toISOString(), JSON.stringify({ countries }))
      .run();
    if ((inserted.meta?.changes ?? 0) === 0) continue;

    const locale = order.locale === "ru" ? "ru" : "en";
    const email = rulesChangedEmail({ locale, siteUrl: deps.siteUrl, orderId: order.id, countries });
    const { id } = await deps.email.send({ to: order.email, ...email, idempotencyKey: marker });
    await deps.db.prepare("UPDATE reminders SET resend_id = ?1 WHERE id = ?2").bind(id, marker).run();
    sent += 1;
  }
  return sent;
}

/** Ежедневный cron (worker.ts): поставить подошедшие напоминания и разослать письма об изменении правил. */
export async function runDaily(deps: Deps): Promise<{ scheduled: number; ruleChangeEmails: number }> {
  const scheduled = await scheduleDueReminders(deps);
  const ruleChangeEmails = await notifyRuleChanges(deps);
  return { scheduled, ruleChangeEmails };
}
