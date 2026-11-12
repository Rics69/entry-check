import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createRollyPayPayment, RollyPayError } from "./rollypay";
import { verifySignature } from "./signature";

describe("подпись колбэков RollyPay", () => {
  const secret = "whsec_test";
  const body = '{"event_type":"payment.paid","payment_id":"pay_1","status":"paid"}';
  const ts = "1794400000";
  // Эталон считаем независимо — через Node crypto, как в примере из документации.
  const good = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

  it("верная подпись", async () => {
    expect(await verifySignature({ rawBody: body, timestamp: ts, signature: good, secret, nowSeconds: Number(ts) + 10 })).toBe("ok");
  });

  it("подменённое тело или чужой ключ", async () => {
    expect(await verifySignature({ rawBody: body.replace("paid", "refunded"), timestamp: ts, signature: good, secret, nowSeconds: Number(ts) })).toBe("invalid");
    expect(await verifySignature({ rawBody: body, timestamp: ts, signature: good, secret: "other", nowSeconds: Number(ts) })).toBe("invalid");
  });

  it("старше 5 минут или без заголовков", async () => {
    expect(await verifySignature({ rawBody: body, timestamp: ts, signature: good, secret, nowSeconds: Number(ts) + 301 })).toBe("stale");
    expect(await verifySignature({ rawBody: body, timestamp: null, signature: good, secret })).toBe("missing");
  });
});

describe("создание платежа RollyPay", () => {
  const input = {
    orderId: "o1",
    amount: 6.99,
    currency: "EUR" as const,
    description: "Entry Check — Trip Pack",
    successUrl: "https://x/en/pay/success?order=o1",
    failUrl: "https://x/en/pay/fail?order=o1",
    metadata: { orderId: "o1", locale: "en" },
    test: true,
  };

  it("запрос по документации: X-API-Key, X-Nonce, сумма строкой, EUR → intl_card", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ payment_id: "pay_1", pay_url: "https://pay.rollypay.io/pay/tok", expires_at: "2026-11-12T10:30:00Z" })));
    const result = await createRollyPayPayment(input, { apiKey: "rpk_test" }, fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ paymentId: "pay_1", payUrl: "https://pay.rollypay.io/pay/tok", expiresAt: "2026-11-12T10:30:00Z" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://rollypay.io/api/v1/payments");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("rpk_test");
    expect(headers["X-Nonce"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(String(init.body))).toMatchObject({ amount: "6.99", payment_currency: "EUR", payment_method: "intl_card", order_id: "o1", test: true });
  });

  it("рубли — без метода, человек выбирает СБП или карту на форме", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ payment_id: "p", pay_url: "u" })));
    await createRollyPayPayment({ ...input, amount: 490, currency: "RUB", test: false }, { apiKey: "k" }, fetchImpl as unknown as typeof fetch);
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).toMatchObject({ amount: "490.00", payment_currency: "RUB" });
    expect(body).not.toHaveProperty("payment_method");
    expect(body).not.toHaveProperty("test");
  });

  it("ошибка кассы", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "payment cap exceeded" }), { status: 400 }));
    await expect(createRollyPayPayment(input, { apiKey: "k" }, fetchImpl as unknown as typeof fetch)).rejects.toBeInstanceOf(RollyPayError);
  });
});
