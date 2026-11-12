import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmailsView, type OutboxRow } from "@/components/dev/emails-view";
import { requestDeps } from "@/lib/deps";

// Только для `next dev`: письма, которые «ушли» в заглушку outbox, пока не подключён Resend.
export const dynamic = "force-dynamic";

export const metadata: Metadata = process.env.NODE_ENV === "development" ? { title: "Письма — Entry Check" } : {};

export default async function EmailsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const deps = await requestDeps();
  const { results } = await deps.db
    .prepare("SELECT id, to_email, subject, html, scheduled_at, status, created_at FROM outbox ORDER BY created_at DESC, scheduled_at LIMIT 100")
    .all<OutboxRow>();
  return <EmailsView emails={results} provider={deps.email.name} />;
}
