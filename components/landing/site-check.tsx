"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { track } from "@/lib/analytics";
import { findOfficialDomain, hostnameOf, suggestZonesForHost, type OfficialMatch } from "@/lib/rules/official";
import type { ZoneCode } from "@/lib/rules/types";
import { ArrowUpRightIcon, CheckIcon } from "../icons";

export type PortalLink = { label: string; url: string; host: string };

type Result =
  | { type: "invalid" }
  | { type: "official"; host: string; match: OfficialMatch }
  | { type: "unknown"; host: string; zones: ZoneCode[] };

const EXAMPLES = {
  ru: ["tdac.immigration.go.th", "evisa.gov.vn", "indianvisaonline.gov.in"],
  en: ["tdac.immigration.go.th", "gov.uk/eta", "esta.cbp.dhs.gov"],
};

/**
 * «Проверьте сайт»: сверка домена со списком госпорталов (data/official-domains.json).
 * Без ИИ и без запросов в сеть — всё в браузере.
 */
export function SiteCheck({
  portals,
  zoneNames,
}: {
  portals: Partial<Record<ZoneCode, PortalLink[]>>;
  zoneNames: Record<ZoneCode, string>;
}) {
  const t = useTranslations("siteCheck");
  const locale = useLocale();
  const lang = locale === "ru" ? "ru" : "en";
  const inputId = useId();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  function check(input: string) {
    const host = hostnameOf(input);
    if (!host) return setResult({ type: "invalid" });
    const match = findOfficialDomain(input);
    if (match) {
      track("site_check", { result: "official", host, zone: match.zone });
      return setResult({ type: "official", host, match });
    }
    const zones = suggestZonesForHost(host);
    track("site_check", { result: "unknown", host, zone: zones.join(",") });
    setResult({ type: "unknown", host, zones });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    check(value);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          {t("label")}
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("placeholder")}
          className="h-12 min-w-0 flex-1 rounded-lg border border-border-strong bg-background px-4 text-base transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none"
        />
        <button
          type="submit"
          className="h-12 rounded-lg bg-foreground px-6 text-base font-medium text-background transition hover:opacity-90"
        >
          {t("submit")}
        </button>
      </form>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        {t("examples")}
        {EXAMPLES[lang].map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setValue(example);
              check(example);
            }}
            className="min-h-9 rounded-md border border-border px-2.5 font-mono text-[13px] text-foreground transition-colors hover:border-accent"
          >
            {example}
          </button>
        ))}
      </p>

      <div aria-live="polite">
        {result?.type === "invalid" && <p className="mt-5 text-sm text-stop">{t("invalid")}</p>}

        {result?.type === "official" && (
          <div className="mt-5 flex gap-3 rounded-xl bg-ok-soft p-4">
            <CheckIcon className="mt-0.5 size-5 shrink-0 text-ok" />
            <div>
              <p className="font-medium text-ok">
                {t("official")}: <span className="font-mono">{result.host}</span>
              </p>
              <p className="mt-1 text-sm text-foreground">
                {t("officialText", { label: result.match.label[lang], country: zoneNames[result.match.zone] })}
              </p>
            </div>
          </div>
        )}

        {result?.type === "unknown" && (
          <div className="mt-5 rounded-xl bg-stop-soft p-4">
            <p className="font-medium text-stop">
              {t("notFound")}: <span className="font-mono break-all">{result.host}</span>
            </p>
            <p className="mt-1 text-sm text-foreground">{t("notFoundText")}</p>
            {result.zones.map((zone) =>
              portals[zone]?.length ? (
                <div key={zone} className="mt-4">
                  <p className="text-sm font-medium">{t("suggest", { country: zoneNames[zone] })}</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {portals[zone]!.map((portal) => (
                      <li key={portal.url}>
                        <a
                          href={portal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-border-strong bg-surface px-3.5 text-sm transition-colors hover:border-accent hover:text-accent"
                        >
                          <span className="truncate">{portal.label}</span>
                          <span className="hidden truncate text-muted sm:inline">{portal.host}</span>
                          <ArrowUpRightIcon className="size-4 shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
}
