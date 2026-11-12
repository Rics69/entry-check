"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type OutboxRow = {
  id: string;
  to_email: string;
  subject: string;
  html: string;
  scheduled_at: string | null;
  status: string;
  created_at: string;
};

const STATUS: Record<string, string> = {
  sent: "bg-ok-soft text-ok",
  scheduled: "bg-accent-soft text-accent",
  canceled: "bg-background text-subtle line-through",
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function EmailsView({ emails, provider }: { emails: OutboxRow[]; provider: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(emails[0]?.id ?? null);
  const [cron, setCron] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const current = emails.find((e) => e.id === selected);

  async function runCron() {
    setCron("…");
    const response = await fetch("/api/dev/cron", { method: "POST" });
    const data = (await response.json().catch(() => null)) as { scheduled?: number; ruleChangeEmails?: number } | null;
    setCron(data ? `поставлено напоминаний: ${data.scheduled}, писем «правила изменились»: ${data.ruleChangeEmails}` : `ошибка ${response.status}`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted">
        Entry Check · только в режиме разработки ·{" "}
        <Link href="/dev/rules" className="text-accent hover:underline">
          сверка правил
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Письма</h1>
          <p className="mt-1 text-sm text-muted">
            {provider === "outbox"
              ? "Resend не подключён: письма никуда не уходят, а складываются в таблицу outbox."
              : "Подключён Resend: письма уходят на самом деле, здесь пусто."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={runCron}
            className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            Запустить ежедневный cron
          </button>
          {cron && <p className="text-xs text-muted">{cron}</p>}
        </div>
      </div>

      {emails.length === 0 ? (
        <p className="mt-10 text-muted">Писем пока нет. Купите Trip Pack на тестовой оплате — здесь появится чек-лист и напоминания.</p>
      ) : (
        <div className={`mt-6 grid gap-6 lg:grid-cols-[360px_1fr] ${isPending ? "opacity-60" : ""}`}>
          <ul className="flex flex-col gap-2">
            {emails.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelected(e.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm transition-colors ${
                    e.id === selected ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{e.subject}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${STATUS[e.status] ?? ""}`}>{e.status}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {e.to_email} · {e.scheduled_at ? `отправка ${fmt(e.scheduled_at)}` : `создано ${fmt(e.created_at)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {current && (
            <iframe
              title={current.subject}
              srcDoc={current.html}
              sandbox=""
              className="h-[75vh] w-full rounded-xl border border-border bg-white"
            />
          )}
        </div>
      )}
    </div>
  );
}
