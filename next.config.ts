import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Cache Components (дефолт create-next-app 16.4) выключены намеренно:
  // документация Next.js гарантирует их работу только в Node.js-рантайме,
  // а мы работаем на Cloudflare Workers через OpenNext. См. docs/DEV_PLAN.md.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default async function config(phase: string): Promise<NextConfig> {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // Подключает биндинги Cloudflare (D1, переменные из .dev.vars) к `next dev`.
    const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
    await initOpenNextCloudflareForDev();
  }
  return withNextIntl(nextConfig);
}
