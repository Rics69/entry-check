"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { formatFee } from "@/lib/format";

type OrderInfo = { status: string; amount: string; currency: string; d: string | null };
type Load = { state: "loading" } | { state: "missing" } | { state: "ready"; order: OrderInfo };

const POLL_MS = 2000;
const POLL_LIMIT = 15;

/** Заказ по ?order= с опросом статуса: колбэк оплаты может прийти на пару секунд позже, чем человек вернулся. */
function useOrder(poll: boolean): Load & { orderId: string | null } {
  const orderId = useSearchParams().get("order");
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let attempts = 0;
    async function tick() {
      attempts += 1;
      const response = await fetch(`/api/orders/${orderId}`, { cache: "no-store" }).catch(() => null);
      if (cancelled) return;
      if (!response?.ok) return setLoad({ state: "missing" });
      const order = (await response.json()) as OrderInfo;
      setLoad({ state: "ready", order });
      if (poll && order.status === "created" && attempts < POLL_LIMIT) setTimeout(tick, POLL_MS);
    }
    void tick();
    return () => {
      cancelled = true;
    };
  }, [orderId, poll]);

  return { ...(orderId ? load : { state: "missing" as const }), orderId };
}

const PRIMARY = "inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 font-medium text-on-accent transition hover:bg-accent-hover";

export function PaySuccess() {
  const t = useTranslations("pay");
  const result = useOrder(true);

  if (result.state === "loading") return <Spinner />;
  if (result.state === "missing") return <Message title={t("notFound")} />;
  const paid = result.order.status === "paid";

  return (
    <Message
      title={paid ? t("successTitle") : t("waitingTitle")}
      text={paid ? t("successText") : t("waitingText")}
      tone={paid ? "ok" : "wait"}
    >
      {paid && (
        <Link href={`/trip/${result.orderId}`} className={PRIMARY}>
          {t("openTrip")}
        </Link>
      )}
    </Message>
  );
}

export function PayFail() {
  const t = useTranslations("pay");
  const result = useOrder(false);

  if (result.state === "loading") return <Spinner />;
  if (result.state === "missing") return <Message title={t("notFound")} />;
  return (
    <Message title={t("failTitle")} text={t("failText")} tone="stop">
      {result.order.d && (
        <Link href={{ pathname: "/trip", query: { d: result.order.d } }} className={PRIMARY}>
          {t("retry")}
        </Link>
      )}
    </Message>
  );
}

/** Заглушка платёжной формы для NEXT_PUBLIC_PAYMENTS_MODE=mock. */
export function MockCheckout({ enabled }: { enabled: boolean }) {
  const t = useTranslations("pay");
  const locale = useLocale();
  const result = useOrder(false);
  const [busy, setBusy] = useState(false);

  if (!enabled) return <Message title={t("mockUnavailable")} />;
  if (result.state === "loading") return <Spinner />;
  if (result.state === "missing") return <Message title={t("notFound")} />;

  async function finish(outcome: "paid" | "canceled") {
    setBusy(true);
    const response = await fetch("/api/pay/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: result.orderId, outcome }),
    });
    const data = (await response.json().catch(() => null)) as { redirect?: string } | null;
    window.location.assign(data?.redirect ?? `/${locale}`);
  }

  const amount = formatFee({ amount: Number(result.order.amount), currency: result.order.currency }, locale);
  return (
    <Message title={t("mockTitle")} text={t("mockText")} tone="wait">
      <p className="text-2xl font-semibold">{t("mockAmount", { amount: amount ?? "" })}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => finish("paid")} className={`${PRIMARY} disabled:opacity-60`}>
          {t("mockPay")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => finish("canceled")}
          className="inline-flex min-h-12 items-center rounded-lg border border-border-strong px-6 font-medium hover:border-stop hover:text-stop disabled:opacity-60"
        >
          {t("mockCancel")}
        </button>
      </div>
    </Message>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16" aria-busy="true">
      <span className="size-8 animate-spin rounded-full border-4 border-border border-t-accent" />
    </div>
  );
}

function Message({
  title,
  text,
  tone,
  children,
}: {
  title: string;
  text?: string;
  tone?: "ok" | "stop" | "wait";
  children?: React.ReactNode;
}) {
  const color = tone === "ok" ? "bg-ok" : tone === "stop" ? "bg-stop" : tone === "wait" ? "bg-warn" : "bg-subtle";
  return (
    <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <span className={`size-3 rounded-full ${color}`} aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {text && <p className="leading-relaxed text-muted">{text}</p>}
      {children}
    </div>
  );
}
