import type { ServerEnv } from "@/lib/config";
import { outboxProvider, resendProvider, type EmailProvider } from "@/lib/email/provider";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

/** Всё, что нужно логике заказов и напоминаний. Передаётся явно — так её можно тестировать без Cloudflare. */
export type Deps = {
  db: D1Database;
  email: EmailProvider;
  siteUrl: string;
  now: () => Date;
};

export type WorkerEnv = { DB: D1Database; SITE_URL?: string } & ServerEnv;

/**
 * Зависимости из окружения воркера. Нет RESEND_API_KEY — письма уходят в таблицу outbox (заглушка).
 * SITE_URL из env нужен ежедневному cron: он собирается без Next.js и не видит NEXT_PUBLIC_*.
 */
export function depsFromEnv(env: WorkerEnv): Deps {
  const email = env.RESEND_API_KEY
    ? resendProvider({
        apiKey: env.RESEND_API_KEY,
        from: env.EMAIL_FROM ?? "Entry Check <onboarding@resend.dev>",
        replyTo: SUPPORT_EMAIL,
      })
    : outboxProvider(env.DB);
  return { db: env.DB, email, siteUrl: (env.SITE_URL || SITE_URL).replace(/\/$/, ""), now: () => new Date() };
}

/** Для Route Handlers и серверных страниц. */
export async function requestDeps(): Promise<Deps> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return depsFromEnv(env as unknown as WorkerEnv);
}
