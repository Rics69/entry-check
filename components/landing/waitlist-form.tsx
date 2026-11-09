"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";

type State = "idle" | "sending" | "success" | "error" | "invalid";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** «Сообщить о запуске» Traveler Pass: email → /api/waitlist (таблица waitlist в D1). */
export function WaitlistForm({ submitLabel, source }: { submitLabel: string; source: string }) {
  const t = useTranslations("waitlist");
  const locale = useLocale();
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setState("invalid");
    setState("sending");
    const honeypot = new FormData(event.currentTarget).get("website");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale, source, website: honeypot }),
      });
      setState(response.ok ? "success" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <p role="status" className="rounded-lg bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
        {t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {t("label")}
      </label>
      <input
        id={inputId}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "invalid" || state === "error") setState("idle");
        }}
        placeholder={t("placeholder")}
        aria-invalid={state === "invalid"}
        className="h-12 rounded-lg border border-border-strong bg-background px-4 text-base focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none aria-[invalid=true]:border-stop"
      />
      {/* Ловушка для ботов: людям поле не видно. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-1 h-12 rounded-lg border border-foreground px-5 text-base font-medium transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
      >
        {state === "sending" ? t("sending") : submitLabel}
      </button>
      <p role={state === "invalid" || state === "error" ? "alert" : undefined} className={`text-sm ${state === "invalid" || state === "error" ? "text-stop" : "text-muted"}`}>
        {state === "invalid" ? t("invalid") : state === "error" ? t("error") : t("privacy")}
      </p>
    </form>
  );
}
