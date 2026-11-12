/** Публичный адрес сайта: для metadataBase, ссылок в письмах и redirect-URL оплаты. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Entry Check";

/**
 * Почта поддержки: «Контакты», «Сообщить об ошибке», reply-to писем и гарантия возврата.
 * Заполнитель на зарезервированном домене .example — замените в .env.local / на Cloudflare.
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@entry-check.example";

/*
 * Продавец — самозанятый (плательщик налога на профессиональный доход).
 * На сайте обязательно ФИО и ИНН: в условиях, политике конфиденциальности и подвале.
 * Для английских страниц — ФИО латиницей (если не задано, берётся русское).
 */
const SELLER_NAME = process.env.NEXT_PUBLIC_SELLER_NAME?.trim() ?? "";
const SELLER_NAME_EN = process.env.NEXT_PUBLIC_SELLER_NAME_EN?.trim() || SELLER_NAME;
const SELLER_INN = process.env.NEXT_PUBLIC_SELLER_INN?.trim() ?? "";

/** Реквизиты заданы — можно показывать в подвале. */
export const SELLER_CONFIGURED = Boolean(SELLER_NAME && SELLER_INN);

/** Строка продавца на языке страницы; без реквизитов — заметный заполнитель. */
export function legalSeller(locale: "ru" | "en"): string {
  if (!SELLER_CONFIGURED) return locale === "ru" ? "[ФИО самозанятого, ИНН]" : "[self-employed seller's name, INN]";
  return locale === "ru"
    ? `${SELLER_NAME}, самозанятый (плательщик налога на профессиональный доход), ИНН ${SELLER_INN}`
    : `${SELLER_NAME_EN}, self-employed individual (professional income tax payer, Russia), INN ${SELLER_INN}`;
}
