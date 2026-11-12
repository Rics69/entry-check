/**
 * Клиент RollyPay по документации docs.rollypay.io (ноябрь 2026).
 * С настоящей кассой ещё не проверен — ключи выдаются при подключении.
 *
 *   POST /api/v1/payments, заголовки X-API-Key и X-Nonce (UUID, не повторяется 10 минут)
 *   RUB — по умолчанию, человек выбирает СБП или карту на форме; EUR — только с payment_method: "intl_card"
 *   Платёж живёт 30 минут (expires_at), дальше — колбэк expired; поздний paid возможен.
 */

export const DEFAULT_BASE_URL = "https://rollypay.io";

export type CreatePaymentInput = {
  orderId: string;
  amount: number;
  currency: "RUB" | "EUR";
  description: string;
  successUrl: string;
  failUrl: string;
  metadata: Record<string, string>;
  test: boolean;
};

export type CreatedPayment = { paymentId: string; payUrl: string; expiresAt?: string };

export class RollyPayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function createRollyPayPayment(
  input: CreatePaymentInput,
  config: { apiKey: string; baseUrl?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CreatedPayment> {
  const body = {
    amount: input.amount.toFixed(2),
    payment_currency: input.currency,
    ...(input.currency === "EUR" ? { payment_method: "intl_card" } : {}),
    order_id: input.orderId,
    description: input.description,
    success_redirect_url: input.successUrl,
    fail_redirect_url: input.failUrl,
    metadata: input.metadata,
    ...(input.test ? { test: true } : {}),
  };

  const response = await fetchImpl(`${config.baseUrl ?? DEFAULT_BASE_URL}/api/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
      "X-Nonce": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    payment_id?: string;
    pay_url?: string;
    expires_at?: string;
    error?: string;
  };
  if (!response.ok || !data.payment_id || !data.pay_url) {
    throw new RollyPayError(data.error ?? `RollyPay HTTP ${response.status}`, response.status);
  }
  return { paymentId: data.payment_id, payUrl: data.pay_url, expiresAt: data.expires_at };
}

/** Тело колбэка (POST на callback_url кассы). */
export type RollyPayCallback = {
  event_type?: string;
  payment_id?: string;
  order_id?: string;
  status?: string;
  amount?: string;
  currency?: string;
  test?: boolean;
  metadata?: Record<string, unknown>;
};
