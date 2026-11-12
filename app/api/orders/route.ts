import { NextResponse, type NextRequest } from "next/server";
import { ALL_PASSPORTS } from "@/data/countries";
import { paymentsMode } from "@/lib/config";
import { requestDeps } from "@/lib/deps";
import { createOrder, setPaymentId } from "@/lib/orders";
import { createRollyPayPayment } from "@/lib/payments/rollypay";
import { randomId } from "@/lib/ids";
import { decodeTrip } from "@/lib/trip-codec";

/**
 * Trip Pack: заказ + платёж. Ответ — адрес платёжной формы, куда браузер переходит.
 * В режиме mock это тестовая страница /pay/mock, в режиме rollypay — форма RollyPay.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Body = { email?: unknown; locale?: unknown; d?: unknown; consentImmediate?: unknown; consentReference?: unknown };

export async function POST(request: NextRequest) {
  const mode = paymentsMode();
  if (mode === "off") return NextResponse.json({ error: "payments_off" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Body | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const locale = body?.locale === "ru" ? "ru" : "en";
  const trip = typeof body?.d === "string" ? decodeTrip(body.d) : null;

  if (!EMAIL_RE.test(email) || email.length > 254) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (!trip || !ALL_PASSPORTS.includes(trip.passport)) return NextResponse.json({ error: "invalid_trip" }, { status: 400 });
  // Обе галочки обязательны: согласие на немедленное исполнение (право ЕС на отказ) и «это справка».
  if (body?.consentImmediate !== true || body?.consentReference !== true) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  const deps = await requestDeps();
  const origin = new URL(request.url).origin;
  const order = await createOrder(deps, { email, locale, trip, provider: mode });
  const successUrl = `${origin}/${locale}/pay/success?order=${order.id}`;
  const failUrl = `${origin}/${locale}/pay/fail?order=${order.id}`;

  if (mode === "mock") {
    const paymentId = randomId("mock_");
    await setPaymentId(deps.db, order.id, paymentId);
    return NextResponse.json({ orderId: order.id, payUrl: `${origin}/${locale}/pay/mock?order=${order.id}` });
  }

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const secrets = env as unknown as { ROLLYPAY_API_KEY?: string; ROLLYPAY_BASE_URL?: string; ROLLYPAY_TEST?: string };
  if (!secrets.ROLLYPAY_API_KEY) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });

  try {
    const payment = await createRollyPayPayment(
      {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency as "RUB" | "EUR",
        description: "Entry Check — Trip Pack",
        successUrl,
        failUrl,
        metadata: { orderId: order.id, locale },
        test: secrets.ROLLYPAY_TEST === "true",
      },
      { apiKey: secrets.ROLLYPAY_API_KEY, baseUrl: secrets.ROLLYPAY_BASE_URL },
    );
    await setPaymentId(deps.db, order.id, payment.paymentId);
    return NextResponse.json({ orderId: order.id, payUrl: payment.payUrl });
  } catch (error) {
    console.error("RollyPay create payment failed", error);
    return NextResponse.json({ error: "payment_failed" }, { status: 502 });
  }
}
