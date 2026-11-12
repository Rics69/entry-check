"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flagEmoji } from "@/data/countries";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { countryName } from "@/lib/format";
import { evaluateTrip } from "@/lib/rules/engine";
import { decodeTrip } from "@/lib/trip-codec";
import { StatusBadge } from "../trip/status-badge";
import { StopCard } from "../trip/stop-card";
import { TripSummaryText } from "../trip/trip-summary";
import { TripPackOffer } from "./trip-pack-offer";

const noopSubscribe = () => () => {};

const SECONDARY_BUTTON =
  "press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium hover:border-accent hover:text-accent";

/**
 * Результат проверки по ссылке /trip?d=… Считается в браузере — сервер не участвует,
 * поэтому даже тысячи переходов из соцсетей не тратят лимиты Cloudflare.
 */
export function TripView() {
  const t = useTranslations("tripPage");
  const locale = useLocale();
  const raw = useSearchParams().get("d");

  const trip = useMemo(() => decodeTrip(raw), [raw]);
  const result = useMemo(() => (trip ? evaluateTrip(trip, { now: new Date() }) : null), [trip]);

  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (!trip || !result || tracked.current === raw) return;
    tracked.current = raw;
    track("check_result", {
      passport: trip.passport,
      zones: result.stops.map((s) => s.zone ?? "none").join(","),
      stops: result.stops.length,
      overall: result.overall,
    });
  }, [raw, trip, result]);

  if (!trip || !result || !raw) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-2xl font-semibold">{t("invalidTitle")}</h1>
        <p className="mt-2 text-muted">{t("invalidText")}</p>
        <Link href="/check" data-sound="press" className="press mt-6 inline-flex min-h-12 items-center rounded-lg bg-accent px-6 font-medium text-on-accent hover:bg-accent-hover">
          {t("checkAgain")}
        </Link>
      </div>
    );
  }

  const route = trip.stops.map((s) => countryName(s.country, locale)).join(" → ");

  return (
    <div>
      <header className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          <span aria-hidden="true">{flagEmoji(trip.passport)}</span>{" "}
          {t("passport", { country: countryName(trip.passport, locale) })}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="text-lg text-muted">{route}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3">
          <StatusBadge status={result.overall} />
          <TripSummaryText summary={result.summary} className="font-medium" />
        </div>
        <TripActions raw={raw} route={route} />
      </header>

      <div className="mt-8 flex flex-col gap-6">
        {result.stops.map((stop, i) => (
          <StopCard key={stop.stopIndexes.join("-")} stop={stop} index={i} />
        ))}
      </div>

      <TripPackOffer d={raw} />

      <footer className="mt-8 flex flex-col gap-2 text-sm text-muted">
        <p className="font-medium text-foreground">{t("recheck")}</p>
        <p>{t("disclaimer")}</p>
      </footer>
    </div>
  );
}

function TripActions({ raw, route }: { raw: string; route: string }) {
  const t = useTranslations("tripPage");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  // «Поделиться» есть не во всех браузерах (обычно на телефонах); на сервере — нет.
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  // Ссылка для попутчиков помечена ?ref=share — видно, сколько людей пришло по пересланным маршрутам.
  const shareUrl = () => `${location.origin}/${locale}/trip?d=${raw}&ref=share`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      track("share", { method: "copy" });
    } catch {
      window.prompt(t("copy"), shareUrl());
    }
  }

  async function share() {
    try {
      await navigator.share({ title: t("title"), text: t("shareText", { route }), url: shareUrl() });
      track("share", { method: "native" });
    } catch {
      // Пользователь закрыл окно «Поделиться» — ничего не делаем.
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Link href={{ pathname: "/check", query: { d: raw } }} data-sound="tap" className={SECONDARY_BUTTON}>
        {t("edit")}
      </Link>
      <button type="button" onClick={copy} data-sound="tap" className={SECONDARY_BUTTON} aria-live="polite">
        {copied ? `✓ ${t("copied")}` : t("copy")}
      </button>
      {canShare && (
        <button type="button" onClick={share} data-sound="tap" className={SECONDARY_BUTTON}>
          {t("share")}
        </button>
      )}
      <button type="button" onClick={() => window.print()} data-sound="tap" className={SECONDARY_BUTTON}>
        {t("print")}
      </button>
    </div>
  );
}
