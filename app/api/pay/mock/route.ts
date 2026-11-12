import { NextResponse, type NextRequest } from "next/server";
import { paymentsMode } from "@/lib/config";
import { requestDeps } from "@/lib/deps";
import { getOrder, handlePaymentEvent } from "@/lib/orders";

/**
 * Заглушка оплаты: страница /pay/mock присылает сюда «оплачено» или «отказ», а дальше заказ проходит
 * тот же путь, что и с настоящим колбэком RollyPay. Работает только при NEXT_PUBLIC_PAYMENTS_MODE=mock.
 */
export async function POST(request: NextRequest) {
  if (paymentsMode() !== "mock") return new NextResponse(null, { status: 404 });

  const body = (await request.json().catch(() => null)) as { orderId?: unknown; outcome?: unknown } | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const outcome = body?.outcome === "paid" ? "paid" : body?.outcome === "canceled" ? "canceled" : null;
  if (!outcome) return NextResponse.json({ error: "bad_outcome" }, { status: 400 });

  const deps = await requestDeps();
  const order = await getOrder(deps.db, orderId);
  if (!order?.payment_id || order.provider !== "mock") return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await handlePaymentEvent(deps, {
    paymentId: order.payment_id,
    status: outcome,
    amount: order.amount,
    currency: order.currency,
    raw: JSON.stringify({ mock: true, outcome }),
  });
  const page = outcome === "paid" ? "success" : "fail";
  return NextResponse.json({ result, redirect: `/${order.locale}/pay/${page}?order=${order.id}` });
}
