"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { track } from "@/lib/analytics";
import { paymentsMode } from "@/lib/config";
import { formatTripPackPrice } from "@/lib/pricing";
import { CheckIcon } from "../icons";
import { LoadingSpinner } from "../ui/loading-spinner";
import { WaitlistForm } from "../landing/waitlist-form";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FEATURES = ["pdf", "remind", "recheck", "changes"] as const;

type State = "idle" | "sending" | "invalidEmail" | "consentRequired" | "error";

/**
 * Платный путь на странице результата: email → две галочки → «Оплатить».
 * Режим оплаты выключен (off) — вместо формы лист ожидания, как в валидации из бизнес-плана.
 */
export function TripPackOffer({ d }: { d: string }) {
  const t = useTranslations("tripPack");
  const locale = useLocale() as Locale;
  const mode = paymentsMode();
  const ids = { email: useId(), immediate: useId(), reference: useId() };
  const [email, setEmail] = useState("");
  const [immediate, setImmediate] = useState(false);
  const [reference, setReference] = useState(false);
  const [state, setState] = useState<State>("idle");

  const features = (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
      {FEATURES.map((key) => (
        <li key={key} className="flex gap-2 text-sm leading-snug">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-ok" />
          {t(`features.${key}`)}
        </li>
      ))}
    </ul>
  );

  if (mode === "off") {
    return (
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6 print:hidden">
        <h2 className="text-xl font-semibold">{t("soonTitle")}</h2>
        <p className="mt-2 text-muted">{t("soonText")}</p>
        {features}
        <div className="mt-5 max-w-sm">
          <WaitlistForm submitLabel={t("soonCta")} source="trip_pack" />
        </div>
      </section>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setState("invalidEmail");
    if (!immediate || !reference) return setState("consentRequired");
    setState("sending");
    track("buy_click", { mode });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale, d, consentImmediate: immediate, consentReference: reference }),
      });
      const data = (await response.json().catch(() => null)) as { payUrl?: string } | null;
      if (!response.ok || !data?.payUrl) throw new Error(String(response.status));
      window.location.assign(data.payUrl);
    } catch {
      setState("error");
    }
  }

  const legalLink = (href: "/legal/terms" | "/legal/refunds") =>
    function LegalLink(chunks: ReactNode) {
      return (
        <Link href={href} className="text-accent hover:underline" target="_blank">
          {chunks}
        </Link>
      );
    };
  const message =
    state === "invalidEmail" ? t("invalidEmail") : state === "consentRequired" ? t("consentRequired") : state === "error" ? t("error") : null;

  return (
    <section className="mt-8 rounded-2xl border border-accent bg-surface p-5 sm:p-6 print:hidden" aria-labelledby={`${ids.email}-title`}>
      <h2 id={`${ids.email}-title`} className="text-xl font-semibold">
        {t("title")}
      </h2>
      {features}

      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-3">
        <label htmlFor={ids.email} className="text-sm font-medium">
          {t("email")}
        </label>
        <input
          id={ids.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "invalidEmail") setState("idle");
          }}
          placeholder={t("emailPlaceholder")}
          aria-invalid={state === "invalidEmail"}
          className="h-12 rounded-lg border border-border-strong bg-background px-4 text-base focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none aria-[invalid=true]:border-stop"
        />

        {(
          [
            [ids.immediate, immediate, setImmediate, t("consentImmediate")],
            [ids.reference, reference, setReference, t("consentReference")],
          ] as const
        ).map(([id, checked, set, label]) => (
          <label key={id} htmlFor={id} className="flex cursor-pointer gap-3 text-sm leading-snug">
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                set(e.target.checked);
                if (state === "consentRequired") setState("idle");
              }}
              className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
            />
            <span>{label}</span>
          </label>
        ))}

        <button
          type="submit"
          disabled={state === "sending"}
          data-sound="press"
          className="press mt-2 inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-on-accent shadow-sm hover:bg-accent-hover disabled:opacity-80"
        >
          {state === "sending" ? (
            <LoadingSpinner size="sm" shimmer={false} label={t("paying")} />
          ) : (
            t("pay", { price: formatTripPackPrice(locale) })
          )}
        </button>

        {message && (
          <p role="alert" className="text-sm text-stop">
            {message}
          </p>
        )}
        <p className="text-xs text-muted">
          {t.rich("terms", { terms: legalLink("/legal/terms"), refunds: legalLink("/legal/refunds") })}
          {mode === "mock" && <span className="mt-1 block font-medium text-warn">{t("mockNote")}</span>}
        </p>
      </form>
    </section>
  );
}
