import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/trip/status-badge";
import { StopCard } from "@/components/trip/stop-card";
import { TripSummaryText } from "@/components/trip/trip-summary";
import { RULES } from "@/data/requirements";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { countryName, formatDay } from "@/lib/format";
import { maskEmail } from "@/lib/order-data";
import { loadPaidTrip } from "@/lib/paid-trip";
import { encodeTrip } from "@/lib/trip-codec";

// Читает заказ из D1 и пересчитывает правила на каждый запрос.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/trip/[orderId]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "paidTrip" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium transition-colors hover:border-accent hover:text-accent";

/** Оплаченная поездка: ссылка из писем Trip Pack. Id заказа нельзя подобрать — он и есть ключ доступа. */
export default async function PaidTripPage({ params }: PageProps<"/[locale]/trip/[orderId]">) {
  const { locale: raw, orderId } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const view = await loadPaidTrip(orderId);
  if (!view) notFound();

  const t = await getTranslations({ locale, namespace: "paidTrip" });
  const tp = await getTranslations({ locale, namespace: "tripPage" });
  const { order, trip, result, changed, reminders } = view;
  const route = trip.stops.map((s) => countryName(s.country, locale)).join(" → ");

  if (order.status !== "paid" && order.status !== "refunded" && order.status !== "chargeback") {
    return (
      <section className="mx-auto max-w-xl px-4 py-12 sm:py-16">
        <h1 className="text-2xl font-semibold">{t("notPaidTitle")}</h1>
        <p className="mt-2 text-muted">{t("notPaidText")}</p>
        <Link href={{ pathname: "/trip", query: { d: encodeTrip(trip) } }} className={`${BUTTON} mt-6`}>
          {t("checkAgain")}
        </Link>
      </section>
    );
  }

  const changedCountries = result.stops.filter((s) => changed.has(s.stopIndexes.join("-"))).flatMap((s) => s.countries);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="flex flex-col gap-4">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="rounded-md bg-accent-soft px-2 py-0.5 font-medium text-accent">{t("badge")}</span>
          {tp("passport", { country: countryName(trip.passport, locale) })}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tp("title")}</h1>
        <p className="text-lg text-muted">{route}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3">
          <StatusBadge status={result.overall} />
          <TripSummaryText summary={result.summary} className="font-medium" />
        </div>

        {order.status === "paid" ? (
          <p className="text-sm text-muted">{t("active", { email: maskEmail(order.email) })}</p>
        ) : (
          <p className="rounded-xl bg-stop-soft px-4 py-3 text-sm">{t("refunded")}</p>
        )}

        {changedCountries.length > 0 && (
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium">
            {t("changed", { countries: changedCountries.map((c) => countryName(c, locale)).join(", ") })}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href={`/trip/${order.id}/print`} className={BUTTON}>
            {t("print")}
          </Link>
        </div>
      </header>

      {order.status === "paid" && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold">{t("remindersTitle")}</h2>
          {reminders.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("noReminders")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {reminders.map((r) => {
                const payload = r.payload ? (JSON.parse(r.payload) as { ruleId?: string }) : {};
                const date = formatDay(r.send_at.slice(0, 10), locale);
                const name = RULES.find((rule) => rule.id === payload.ruleId)?.name[locale] ?? "";
                const label = r.kind === "window_open" ? t("reminderWindow", { date, name }) : t("reminderRecheck", { date });
                return (
                  <li key={`${r.kind}-${r.send_at}-${name}`} className={r.status === "canceled" ? "text-subtle line-through" : ""}>
                    {label}
                    {r.status === "canceled" && ` — ${t("reminderCanceled")}`}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <div className="mt-8 flex flex-col gap-6">
        {result.stops.map((stop, i) => (
          <StopCard
            key={stop.stopIndexes.join("-")}
            stop={stop}
            index={i}
            badge={changed.has(stop.stopIndexes.join("-")) ? t("changedBadge") : undefined}
          />
        ))}
      </div>

      <p className="mt-8 text-sm text-muted">{tp("disclaimer")}</p>
    </section>
  );
}
