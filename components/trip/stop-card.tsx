import { useLocale, useTranslations } from "next-intl";
import { flagEmoji } from "@/data/countries";
import { countryName, displayHost, formatDay, formatFee, zoneName } from "@/lib/format";
import type { RequirementItem, StopResult } from "@/lib/rules/engine";
import { formatLocal } from "@/lib/rules/windows";
import { SUPPORT_EMAIL } from "@/lib/site";
import { ArrowUpRightIcon } from "../icons";
import { StatusBadge, STATUS_STYLES } from "./status-badge";

/**
 * Карточка одной точки маршрута: статус, что оформить, где, сколько стоит и когда.
 * Без хуков состояния — рендерится и на сервере (образец на лендинге), и в браузере (страница результата).
 */
export function StopCard({ stop, index }: { stop: StopResult; index: number }) {
  const t = useTranslations("trip");
  const locale = useLocale();
  const lang = locale === "ru" ? "ru" : "en";

  const title =
    stop.zone === "SCHENGEN"
      ? `${zoneName("SCHENGEN", locale)}: ${stop.countries.map((c) => countryName(c, locale)).join(", ")}`
      : countryName(stop.countries[0], locale);
  const flags = stop.countries.map(flagEmoji).join(" ");
  const items = [...(stop.entry ? [stop.entry] : []), ...stop.extras];
  const reportHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `${t("reportSubject")}: ${stop.countries.join(", ")} — ${items.map((i) => i.requirement.id).join(", ") || "—"}`,
  )}`;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface break-inside-avoid">
      <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_STYLES[stop.status].bar}`} aria-hidden="true" />

      <header className="flex flex-wrap items-start justify-between gap-3 p-5 pl-6">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            {index + 1}. {t("arrival", { date: formatDay(stop.arrivalDate, locale) })}
            {stop.transit && <> · {t("transit")}</>}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">
            <span aria-hidden="true">{flags}</span> {title}
          </h3>
        </div>
        <StatusBadge status={stop.status} />
      </header>

      <div className="flex-1 divide-y divide-border border-t border-border">
        {stop.home && <p className="p-5 pl-6 text-sm leading-relaxed">{t("home")}</p>}

        {stop.transitNote && (
          <p className="p-5 pl-6 text-sm leading-relaxed text-muted">{stop.transitNote[lang]}</p>
        )}

        {stop.status === "unknown" && !stop.home && (
          <div className="p-5 pl-6 text-sm leading-relaxed">
            <p>{t("unknownHint")}</p>
            {stop.portalUrl && <OfficialLink url={stop.portalUrl} label={t("officialPortal")} zone={stop.zone} />}
          </div>
        )}

        {items.map((item) => (
          <RequirementRow key={item.requirement.id} item={item} stop={stop} />
        ))}
      </div>

      {!stop.home && stop.status !== "unknown" && (
        <footer className="flex flex-col gap-2 border-t border-border p-5 pl-6 text-sm text-muted">
          {stop.passportValidity && (
            <p>
              <span className="text-foreground">{t("passport")}:</span> {stop.passportValidity[lang]}
            </p>
          )}
          {stop.onwardTicketMayBeAsked && <p>{t("onward")}</p>}
          <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>
              {stop.verifiedAt ? t("verified", { date: formatDay(stop.verifiedAt, locale, true) }) : t("draft")}
            </span>
            <a href={reportHref} className="text-accent hover:underline print:hidden">
              {t("report")}
            </a>
          </p>
        </footer>
      )}
    </article>
  );
}

function RequirementRow({ item, stop }: { item: RequirementItem; stop: StopResult }) {
  const t = useTranslations("trip");
  const locale = useLocale();
  const lang = locale === "ru" ? "ru" : "en";
  const rule = item.requirement;
  const fee = rule.fee ? (rule.fee.amount === 0 ? t("free") : formatFee(rule.fee, locale)) : null;
  const isInfo = rule.kind === "info";

  return (
    <section className="p-5 pl-6">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{t(`kind.${rule.kind}`)}</p>
      <h4 className="mt-1 font-medium leading-snug">{rule.name[lang]}</h4>

      {(fee || rule.stayLimitDays || rule.processing) && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {fee && (
            <>
              <dt className="text-muted">{t("fee")}</dt>
              <dd>{fee}</dd>
            </>
          )}
          {rule.stayLimitDays && (
            <>
              <dt className="text-muted">{t("stay")}</dt>
              <dd>{t("stayDays", { days: rule.stayLimitDays })}</dd>
            </>
          )}
          {rule.processing && (
            <>
              <dt className="text-muted">{t("processing")}</dt>
              <dd>{rule.processing[lang]}</dd>
            </>
          )}
        </dl>
      )}

      <Timing item={item} stop={stop} />

      {rule.notes && <p className="mt-3 text-sm leading-relaxed text-muted">{rule.notes[lang]}</p>}

      {!isInfo && <OfficialLink url={rule.officialUrl} label={t("official")} zone={stop.zone} rule={rule.id} />}
      {isInfo && (
        <a
          href={rule.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-track="official_click"
          data-zone={stop.zone ?? undefined}
          data-rule={rule.id}
          className="mt-2 inline-block text-sm text-accent hover:underline"
        >
          {displayHost(rule.officialUrl)} ↗
        </a>
      )}
    </section>
  );
}

/** Когда подавать: окно карты прибытия или «подайте до» для ETA и виз. */
function Timing({ item, stop }: { item: RequirementItem; stop: StopResult }) {
  const t = useTranslations("trip");
  const locale = useLocale();
  const rule = item.requirement;
  const w = item.window;

  if (w) {
    const rule_ =
      w.unit === "days"
        ? t("windowRuleDays", { days: rule.windowDaysBeforeArrival ?? 0 })
        : t("windowRuleHours", { hours: rule.windowHoursBeforeArrival ?? 0 });
    let headline: string;
    if (w.state === "upcoming") {
      const withTime = w.unit === "hours" && w.exactTime;
      headline = t(withTime ? "windowOpensAt" : "windowOpensOn", {
        date: formatLocal(w.opensAt, locale, w.timeZone, withTime),
      });
    } else {
      headline = t(w.state === "open" ? "windowOpen" : "windowClosed");
    }
    return (
      <div className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-sm">
        <p className="font-medium text-foreground">{headline}</p>
        <p className="mt-0.5 text-muted">
          {rule_}
          {w.state === "upcoming" && w.unit === "hours" && !w.exactTime && ` ${t("windowEstimated")}`}
        </p>
      </div>
    );
  }

  if (item.applyBy && item.status === "red" && !stop.transit) {
    return (
      <p className="mt-3 rounded-xl bg-stop-soft px-4 py-3 text-sm font-medium text-foreground">
        {t("applyBy", { date: formatDay(item.applyBy, locale) })}
      </p>
    );
  }
  return null;
}

function OfficialLink({ url, label, zone, rule }: { url: string; label: string; zone: string | null; rule?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-track="official_click"
      data-zone={zone ?? undefined}
      data-rule={rule}
      className="group mt-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border-strong px-3.5 py-2 text-sm transition-colors hover:border-accent"
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-medium group-hover:text-accent">{label}</span>
        <span className="truncate text-xs text-muted">{displayHost(url)}</span>
      </span>
      <ArrowUpRightIcon className="size-4 shrink-0 text-muted group-hover:text-accent" />
    </a>
  );
}
