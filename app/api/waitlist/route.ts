import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getDb, nowIso } from "@/lib/db";

/**
 * «Сообщить о запуске» Traveler Pass → таблица waitlist в D1.
 * Повторная подписка того же адреса ничего не добавляет. Поле-ловушка website отсекает простых ботов.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL = 254;

type Body = { email?: unknown; locale?: unknown; source?: unknown; website?: unknown };

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Бот заполнил скрытое поле — отвечаем как обычно, но ничего не сохраняем.
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const locale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;
  const source = typeof body.source === "string" ? body.source.slice(0, 32) : null;

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO waitlist (email, locale, source, ts)
       SELECT ?1, ?2, ?3, ?4
       WHERE NOT EXISTS (SELECT 1 FROM waitlist WHERE email = ?1)`,
    )
    .bind(email, locale, source, nowIso())
    .run();

  return NextResponse.json({ ok: true });
}
