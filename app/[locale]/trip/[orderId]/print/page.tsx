import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PrintButton } from "@/components/trip/print-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { countryName, displayHost, formatDay, formatFee } from "@/lib/format";
import { loadPaidTrip } from "@/lib/paid-trip";
import type { RequirementItem } from "@/lib/rules/engine";
import { formatLocal } from "@/lib/rules/windows";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/trip/[orderId]/print">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "checklist" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * PDF-чек-лист Trip Pack: компактная страница под A4, «Сохранить PDF» — печать браузера.
 * Доступна только оплаченному заказу.
 */
export default async function ChecklistPage({ params }: PageProps<"/[locale]/trip/[orderId]/print">) {
  const { locale: raw, orderId } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const view = await loadPaidTrip(orderId);
  if (!view || view.order.status !== "paid") notFound();

  const t = await getTranslations({ locale, namespace: "checklist" });
  const { trip, result } = view;
  const route = trip.stops.map((s) => countryName(s.country, locale)).join(" → ");
  const today = new Date().toISOString().slice(0, 10);

  function line(item: RequirementItem): string | null {
    const rule = item.requirement;
    const name = rule.name[locale];
    if (item.window) {
      if (item.window.state === "closed") return null;
      if (item.window.state === "open") return t("windowOpen", { name });
      const withTime = item.window.unit === "hours" && item.window.exactTime;
      return t("window", { name, date: formatLocal(item.window.opensAt, locale, item.window.timeZone, withTime) });
    }
    if (item.status === "red") return item.applyBy ? t("applyBy", { name, date: formatDay(item.applyBy, locale) }) : t("apply", { name });
    if (item.status === "yellow" && rule.fee) return t("pay", { name, fee: formatFee(rule.fee, locale) ?? "" });
    return null;
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/trip/${orderId}`} className="text-sm text-accent hover:underline">
          ← {t("back")}
        </Link>
        <PrintButton label={t("save")} />
      </div>

      <header className="border-b border-border pb-4">
        <p className="text-sm font-semibold">Entry Check · Trip Pack</p>
        <h1 className="mt-1 text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-lg">{route}</p>
        <p className="mt-1 text-sm text-muted">{t("passport", { country: countryName(trip.passport, locale) })}</p>
      </header>

      {result.stops.map((stop, i) => {
        const items = [...(stop.entry ? [stop.entry] : []), ...stop.extras];
        const lines = items
          .map((item) => ({ text: line(item), host: displayHost(item.requirement.officialUrl) }))
          .filter((l): l is { text: string; host: string } => Boolean(l.text));
        return (
          <section key={stop.stopIndexes.join("-")} className="break-inside-avoid border-b border-border py-4">
            <h2 className="font-semibold">
              {t("stop", {
                n: i + 1,
                country: stop.countries.map((c) => countryName(c, locale)).join(", "),
                date: formatDay(stop.arrivalDate, locale),
              })}
            </h2>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {lines.length === 0 && <CheckLine text={t("nothing")} />}
              {lines.map((l) => (
                <CheckLine key={l.text} text={l.text} note={t("official", { host: l.host })} />
              ))}
              {lines.length > 0 && stop.passportValidity && <CheckLine text={t("passportRule", { text: stop.passportValidity[locale] })} />}
              {lines.length > 0 && stop.onwardTicketMayBeAsked && <CheckLine text={t("onward")} />}
            </ul>
          </section>
        );
      })}

      <footer className="mt-4 text-xs text-muted">
        <p>{t("generated", { date: formatDay(today, locale, true) })}</p>
        <p className="mt-1">{t("disclaimer")}</p>
      </footer>
    </article>
  );
}

function CheckLine({ text, note }: { text: string; note?: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-block size-4 shrink-0 rounded border-2 border-foreground/60" aria-hidden="true" />
      <span>
        {text}
        {note && <span className="block text-xs text-muted">{note}</span>}
      </span>
    </li>
  );
}
