import { NextResponse, type NextRequest } from "next/server";
import { requestDeps } from "@/lib/deps";
import { getOrder, parseTrip } from "@/lib/orders";
import { encodeTrip } from "@/lib/trip-codec";

/**
 * Статус заказа для страниц /pay/success и /pay/fail. Без почты и других личных данных:
 * статус, сумма и маршрут (чтобы «Попробовать ещё раз» вернул на ту же проверку).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-z]{20}$/.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const deps = await requestDeps();
  const order = await getOrder(deps.db, id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const trip = parseTrip(order);
  return NextResponse.json(
    { status: order.status, locale: order.locale, amount: order.amount, currency: order.currency, d: trip ? encodeTrip(trip) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
