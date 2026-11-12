import { NextResponse, type NextRequest } from "next/server";
import { requestDeps } from "@/lib/deps";
import { handlePaymentEvent } from "@/lib/orders";
import type { RollyPayCallback } from "@/lib/payments/rollypay";
import { verifySignature } from "@/lib/payments/signature";

/**
 * Колбэки RollyPay. Подпись проверяем по сырому телу, до разбора JSON.
 * Отвечаем 2xx быстрее 10 секунд, иначе RollyPay повторит (до 8 раз, около часа).
 * 5xx — когда хотим повтора (сбой отправки письма); 4xx — когда повтор бессмыслен.
 */
export async function POST(request: NextRequest) {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const secret = (env as unknown as { ROLLYPAY_SIGNING_SECRET?: string }).ROLLYPAY_SIGNING_SECRET;
  if (!secret) return new NextResponse(null, { status: 503 });

  const rawBody = await request.text();
  const check = await verifySignature({
    rawBody,
    timestamp: request.headers.get("x-timestamp"),
    signature: request.headers.get("x-signature"),
    secret,
  });
  if (check !== "ok") return NextResponse.json({ error: `signature_${check}` }, { status: 403 });

  let callback: RollyPayCallback;
  try {
    callback = JSON.parse(rawBody) as RollyPayCallback;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  // payout.completed и прочие события без статуса платежа нам не нужны — подтверждаем и игнорируем.
  if (!callback.payment_id || !callback.status) return NextResponse.json({ ok: true, result: "ignored" });

  try {
    const result = await handlePaymentEvent(await requestDeps(), {
      paymentId: callback.payment_id,
      status: callback.status,
      amount: callback.amount,
      currency: callback.currency,
      raw: rawBody,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("RollyPay callback failed", error);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
