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

/**
 * Продавец для юридических страниц. Заполнитель, пока не зарегистрирована компания или ИП
 * (см. «Компания и налоги» в бизнес-плане).
 */
export const LEGAL_SELLER = process.env.NEXT_PUBLIC_LEGAL_SELLER || "[название компании или ИП, ИНН или рег. номер]";
