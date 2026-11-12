import { beforeEach, describe, expect, it } from "vitest";
import { fakeD1 } from "@/tests/helpers/fake-d1";
import type { Deps } from "./deps";
import type { EmailProvider, OutgoingEmail } from "./email/provider";
import { consentTexts, createOrder, getOrder, handlePaymentEvent, parseConsent, setPaymentId } from "./orders";
import { notifyRuleChanges, planReminders, runDaily } from "./reminders";
import { evaluateTrip } from "./rules/engine";
import type { Trip } from "./rules/types";

/** Почта, которая всё запоминает. failNext — следующая отправка упадёт (проверка повторной обработки). */
function memoryEmail() {
  const sent: (OutgoingEmail & { id: string })[] = [];
  const canceled: string[] = [];
  let failNext = false;
  const provider: EmailProvider & { sent: typeof sent; canceled: string[]; failOnce(): void } = {
    name: "outbox",
    sent,
    canceled,
    failOnce: () => {
      failNext = true;
    },
    async send(email) {
      if (failNext) {
        failNext = false;
        throw new Error("SMTP down");
      }
      const existing = sent.find((e) => email.idempotencyKey && e.idempotencyKey === email.idempotencyKey);
      if (existing) return { id: existing.id };
      const id = `em_${sent.length + 1}`;
      sent.push({ ...email, id });
      return { id };
    },
    async cancel(id) {
      canceled.push(id);
    },
  };
  return provider;
}

const NOW = new Date("2026-11-12T10:00:00Z");
// Таиланд через 33 дня (TDAC: окно через ~30 дней — за горизонтом), Вьетнам через 40.
const trip: Trip = {
  passport: "RU",
  stops: [
    { country: "TH", date: "2026-12-15", time: "09:30" },
    { country: "VN", date: "2026-12-22" },
  ],
};

let deps: Deps;
let email: ReturnType<typeof memoryEmail>;

beforeEach(() => {
  email = memoryEmail();
  deps = { db: fakeD1(), email, siteUrl: "https://entry-check.example", now: () => NOW };
});

async function paidOrder() {
  const order = await createOrder(deps, { email: "traveller@example.com", locale: "ru", trip, provider: "mock" });
  await setPaymentId(deps.db, order.id, "pay_1");
  return order;
}

describe("заказ и оплата", () => {
  it("цена из трека: RU — 490.00 RUB, снимок правил сохранён", async () => {
    const order = await createOrder(deps, { email: "a@b.co", locale: "ru", trip, provider: "mock" });
    expect(order).toMatchObject({ status: "created", amount: "490.00", currency: "RUB" });
    expect(Object.keys(JSON.parse(order.rules_snapshot!))).toEqual(expect.arrayContaining(["th-bilateral-30", "th-tdac", "vn-dac"]));
  });

  it("согласие сохраняется дословно и с временем, письмо его подтверждает", async () => {
    const order = await createOrder(deps, { email: "a@b.co", locale: "ru", trip, provider: "mock" });
    const stored = await getOrder(deps.db, order.id);
    expect(stored?.consent_at).toBe(NOW.toISOString());
    expect(parseConsent(stored!)).toEqual(consentTexts("ru"));
    expect(consentTexts("ru")[0]).not.toContain("14 дней");

    await setPaymentId(deps.db, order.id, "pay_ru");
    await handlePaymentEvent(deps, { paymentId: "pay_ru", status: "paid", raw: "{}" });
    expect(email.sent[0].html).toContain(`«${consentTexts("ru")[0]}»`);
    expect(email.sent[0].text).toContain("При оплате вы отметили:");
  });

  it("EN: письмо подтверждает согласие на немедленное исполнение и отказ от 14 дней", async () => {
    const order = await createOrder(deps, { email: "a@b.co", locale: "en", trip, provider: "mock" });
    expect(order).toMatchObject({ amount: "6.99", currency: "EUR" });
    await setPaymentId(deps.db, order.id, "pay_en");
    await handlePaymentEvent(deps, { paymentId: "pay_en", status: "paid", raw: "{}" });
    expect(email.sent[0].text).toContain("At checkout you confirmed:");
    expect(email.sent[0].text).toContain("14-day right of withdrawal");
  });

  it("paid: заказ оплачен, чек-лист отправлен, напоминания запланированы", async () => {
    const order = await paidOrder();
    expect(await handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", amount: "490.00", currency: "RUB", raw: "{}" })).toBe("paid");

    const fresh = await getOrder(deps.db, order.id);
    expect(fresh).toMatchObject({ status: "paid" });
    expect(fresh?.fulfilled_at).toBeTruthy();
    expect(email.sent.map((e) => e.subject)).toEqual(["Trip Pack: чек-лист поездки Таиланд → Вьетнам"]);
    expect(email.sent[0].html).toContain("tdac.immigration.go.th");

    const { results } = await deps.db.prepare("SELECT kind, status FROM reminders WHERE order_id = ?1 ORDER BY send_at").bind(order.id).all<{ kind: string; status: string }>();
    expect(results.map((r) => r.kind)).toEqual(["window_open", "recheck_72h", "window_open"]);
  });

  it("повтор того же колбэка ничего не дублирует", async () => {
    await paidOrder();
    const event = { paymentId: "pay_1", status: "paid", amount: "490.00", currency: "RUB", raw: "{}" };
    await handlePaymentEvent(deps, event);
    expect(await handlePaymentEvent(deps, event)).toBe("duplicate");
    expect(email.sent).toHaveLength(1);
  });

  it("поздний paid после expired открывает заказ", async () => {
    const order = await paidOrder();
    expect(await handlePaymentEvent(deps, { paymentId: "pay_1", status: "expired", raw: "{}" })).toBe("closed");
    expect((await getOrder(deps.db, order.id))?.status).toBe("expired");
    expect(await handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", raw: "{}" })).toBe("paid");
    expect((await getOrder(deps.db, order.id))?.status).toBe("paid");
  });

  it("сумма или валюта не совпадают — заказ не оплачивается", async () => {
    const order = await paidOrder();
    expect(await handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", amount: "1.00", currency: "RUB", raw: "{}" })).toBe("mismatch");
    expect(await handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", amount: "490.00", currency: "EUR", raw: "{}" })).toBe("mismatch");
    expect((await getOrder(deps.db, order.id))?.status).toBe("created");
  });

  it("неизвестный платёж", async () => {
    expect(await handlePaymentEvent(deps, { paymentId: "nope", status: "paid", raw: "{}" })).toBe("unknown_order");
  });

  it("возврат: заказ закрыт, напоминания отменены, в том числе уже поставленные в очередь", async () => {
    const order = await paidOrder();
    await handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", raw: "{}" });
    // Поставим всё в очередь, как будто прошёл месяц ежедневных cron.
    await runDaily({ ...deps, now: () => new Date("2026-12-10T00:00:00Z") });
    const scheduledBefore = email.sent.filter((e) => e.scheduledAt).length;
    expect(scheduledBefore).toBeGreaterThan(0);

    expect(await handlePaymentEvent(deps, { paymentId: "pay_1", status: "refunded", raw: "{}" })).toBe("reversed");
    expect((await getOrder(deps.db, order.id))?.status).toBe("refunded");
    expect(email.canceled.length).toBe(scheduledBefore);
    const { results } = await deps.db.prepare("SELECT status FROM reminders WHERE order_id = ?1").bind(order.id).all<{ status: string }>();
    expect(new Set(results.map((r) => r.status))).toEqual(new Set(["canceled"]));
  });

  it("письмо упало — повторный колбэк доделывает работу", async () => {
    const order = await paidOrder();
    email.failOnce();
    await expect(handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", raw: "{}" })).rejects.toThrow("SMTP down");
    expect((await getOrder(deps.db, order.id))?.fulfilled_at).toBeNull();

    expect(await handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", raw: "{}" })).toBe("duplicate");
    expect((await getOrder(deps.db, order.id))?.fulfilled_at).toBeTruthy();
    expect(email.sent.filter((e) => e.subject.startsWith("Trip Pack"))).toHaveLength(1);
  });
});

describe("напоминания", () => {
  it("окна подачи и повторная проверка за 72 часа, прошедшие — пропускаются", () => {
    const result = evaluateTrip(trip, { now: NOW });
    const plan = planReminders("o1", trip, result, NOW);
    expect(plan.map((r) => [r.kind, r.payload.ruleId ?? null])).toEqual([
      ["window_open", "th-tdac"],
      ["recheck_72h", null],
      ["window_open", "vn-dac"],
    ]);
    // Повторная проверка — ровно за 72 часа до 09:30 по Бангкоку 15 декабря.
    expect(plan[1].sendAt).toBe("2026-12-12T02:30:00.000Z");

    const late = planReminders("o1", trip, result, new Date("2026-12-14T00:00:00Z"));
    expect(late.map((r) => r.kind)).toEqual(["window_open"]);
  });

  it("сразу в очередь — только то, до чего меньше 29 дней; остальное ставит cron", async () => {
    const order = await paidOrder();
    await handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", raw: "{}" });
    const status = async () =>
      (await deps.db.prepare("SELECT status FROM reminders WHERE order_id = ?1 ORDER BY send_at").bind(order.id).all<{ status: string }>()).results.map((r) => r.status);
    expect(await status()).toEqual(["pending", "pending", "pending"]);

    const r = await runDaily({ ...deps, now: () => new Date("2026-11-20T06:00:00Z") });
    expect(r.scheduled).toBe(2);
    expect(await status()).toEqual(["scheduled", "scheduled", "pending"]);
  });

  it("письмо «правила изменились» — одно на изменение, пометки на странице не пропадают", async () => {
    const order = await paidOrder();
    await handlePaymentEvent(deps, { paymentId: "pay_1", status: "paid", raw: "{}" });
    // Будто при покупке правило TDAC было другим.
    const snapshot = { ...JSON.parse((await getOrder(deps.db, order.id))!.rules_snapshot!), "th-tdac": "00000000" };
    await deps.db.prepare("UPDATE orders SET rules_snapshot = ?1 WHERE id = ?2").bind(JSON.stringify(snapshot), order.id).run();

    expect(await notifyRuleChanges(deps)).toBe(1);
    expect(await notifyRuleChanges(deps)).toBe(0);
    expect(email.sent.at(-1)?.subject).toBe("Правила по вашему маршруту изменились");
    expect(JSON.parse((await getOrder(deps.db, order.id))!.rules_snapshot!)["th-tdac"]).toBe("00000000");
  });
});
