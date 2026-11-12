/**
 * Точка входа воркера Cloudflare: запросы обрабатывает Next.js (сборка OpenNext),
 * а раз в день срабатывает cron из wrangler.jsonc — ставит подошедшие напоминания Trip Pack
 * и рассылает письма «правила изменились».
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — файл появляется после `npm run cf:build`
import handler from "./.open-next/worker.js";
import { depsFromEnv, type WorkerEnv } from "./lib/deps";
import { runDaily } from "./lib/reminders";

export default {
  fetch: handler.fetch,

  async scheduled(_controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      runDaily(depsFromEnv(env)).then(
        (result) => console.log("daily reminders", result),
        (error) => console.error("daily reminders failed", error),
      ),
    );
  },
} satisfies ExportedHandler<WorkerEnv>;
