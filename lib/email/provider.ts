import { randomId } from "@/lib/ids";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** ISO-время отложенной отправки (Resend — до 30 дней вперёд). */
  scheduledAt?: string;
  /** Повтор с тем же ключом не создаст второе письмо. */
  idempotencyKey?: string;
};

export interface EmailProvider {
  readonly name: "resend" | "outbox";
  send(email: OutgoingEmail): Promise<{ id: string }>;
  cancel(id: string): Promise<void>;
}

/**
 * Resend: https://resend.com/docs/api-reference/emails/send-email
 * Отложенные письма не поддерживают вложения — поэтому PDF не прикладываем, а даём ссылку на версию для печати.
 */
export function resendProvider(config: {
  apiKey: string;
  from: string;
  replyTo: string;
  fetchImpl?: typeof fetch;
}): EmailProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const headers = (extra: Record<string, string> = {}) => ({
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    ...extra,
  });

  return {
    name: "resend",
    async send(email) {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: headers(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
        body: JSON.stringify({
          from: config.from,
          to: [email.to],
          reply_to: config.replyTo,
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(email.scheduledAt ? { scheduled_at: email.scheduledAt } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!response.ok || !data.id) throw new Error(`Resend: ${data.message ?? response.status}`);
      return { id: data.id };
    },
    async cancel(id) {
      const response = await fetchImpl(`https://api.resend.com/emails/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
        headers: headers(),
      });
      // Уже отправленное письмо отменить нельзя — это не ошибка для нас.
      if (!response.ok && response.status !== 422) throw new Error(`Resend cancel: ${response.status}`);
    },
  };
}

/**
 * Заглушка, пока Resend не подключён: письма складываются в таблицу outbox и видны на /dev/emails.
 * Ничего никуда не уходит.
 */
export function outboxProvider(db: D1Database, now: () => Date = () => new Date()): EmailProvider {
  return {
    name: "outbox",
    async send(email) {
      if (email.idempotencyKey) {
        const existing = await db.prepare("SELECT id FROM outbox WHERE id = ?1").bind(email.idempotencyKey).first<{ id: string }>();
        if (existing) return { id: existing.id };
      }
      const id = email.idempotencyKey ?? randomId("em_");
      await db
        .prepare(
          `INSERT INTO outbox (id, to_email, subject, html, text, scheduled_at, status, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        )
        .bind(id, email.to, email.subject, email.html, email.text, email.scheduledAt ?? null, email.scheduledAt ? "scheduled" : "sent", now().toISOString())
        .run();
      return { id };
    },
    async cancel(id) {
      await db.prepare("UPDATE outbox SET status = 'canceled' WHERE id = ?1 AND status = 'scheduled'").bind(id).run();
    },
  };
}
