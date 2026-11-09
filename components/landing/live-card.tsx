import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { flagEmoji } from "@/data/countries";
import { countryName, zoneName } from "@/lib/format";
import type { StopResult, TripResult } from "@/lib/rules/engine";
import { StatusBadge } from "../trip/status-badge";
import { useTripSummaryText } from "../trip/trip-summary";

const FIRST_DELAY_MS = 500;
const STEP_MS = 700;

/**
 * «Живая карточка» первого экрана: статусы стран загораются по очереди.
 * Только CSS-анимация (globals.css, .ec-reveal), без JS; при prefers-reduced-motion сразу итог.
 */
export function LiveCard({ result }: { result: TripResult }) {
  const t = useTranslations("landing.live");
  const locale = useLocale();
  const summary = useTripSummaryText(result.summary);
  const summaryDelay = FIRST_DELAY_MS + result.stops.length * STEP_MS;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-[0_4px_6px_rgba(0,0,0,0.07),0_2px_4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <p className="text-sm text-muted">{t("label")}</p>
          <p className="font-medium">
            <span aria-hidden="true">{flagEmoji(result.passport)}</span>{" "}
            {t("passport", { country: countryName(result.passport, locale) })}
          </p>
        </div>
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </span>
      </div>

      <ol className="divide-y divide-border">
        {result.stops.map((stop, i) => (
          <li key={stop.stopIndexes.join("-")} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium">
                <span aria-hidden="true">{stop.countries.map(flagEmoji).join(" ")}</span>{" "}
                {stop.zone === "SCHENGEN" ? zoneName("SCHENGEN", locale) : countryName(stop.countries[0], locale)}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">{stopHeadline(stop, locale, t)}</p>
            </div>
            <span className="grid shrink-0 justify-items-end" style={{ "--delay": `${FIRST_DELAY_MS + i * STEP_MS}ms` } as CSSProperties}>
              <span className="ec-pending col-start-1 row-start-1 inline-flex items-center gap-1.5 self-center text-sm text-muted" aria-hidden="true">
                <span className="size-3 animate-spin rounded-full border-2 border-border-strong border-t-accent motion-reduce:hidden" />
                {t("checking")}
              </span>
              <StatusBadge status={stop.status} className="ec-reveal col-start-1 row-start-1" />
            </span>
          </li>
        ))}
      </ol>

      <p
        className="ec-reveal border-t border-border px-5 py-4 text-sm font-medium"
        style={{ "--delay": `${summaryDelay}ms` } as CSSProperties}
      >
        {summary}
      </p>
    </div>
  );
}

/** Что главное в этой стране: режим въезда и, если есть, первая форма или сбор. */
function stopHeadline(
  stop: StopResult,
  locale: string,
  t: ReturnType<typeof useTranslations<"landing.live">>,
): string {
  const lang = locale === "ru" ? "ru" : "en";
  const entry = stop.entry?.requirement.name[lang];
  const extra = stop.extras.find((i) => i.status !== "green")?.requirement.name[lang];
  if (entry && extra) return t("and", { first: entry, second: extra });
  return entry ?? extra ?? "";
}
