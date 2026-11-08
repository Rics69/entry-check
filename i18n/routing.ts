import { defineRouting } from "next-intl/routing";

/**
 * Два трека — две версии контента:
 * /ru — СНГ (рубли, СБП), /en — остальной мир (евро).
 * Язык без префикса подбирается по браузеру (Accept-Language), выбор запоминается в cookie.
 */
export const routing = defineRouting({
  locales: ["ru", "en"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
