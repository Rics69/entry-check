/** Публичный адрес сайта: для metadataBase, ссылок в письмах и redirect-URL оплаты. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Entry Check";
