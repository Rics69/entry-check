/**
 * Режим оплаты Trip Pack. Задаётся при сборке (NEXT_PUBLIC_*), чтобы и сервер, и кнопка в браузере
 * видели одно и то же значение.
 *
 *   mock     — заглушка: тестовая страница оплаты, деньги не списываются (по умолчанию в разработке)
 *   rollypay — настоящая касса RollyPay (нужны ROLLYPAY_API_KEY и ROLLYPAY_SIGNING_SECRET)
 *   off      — оплата выключена: вместо кнопки «Оплатить» — лист ожидания (по умолчанию в продакшне)
 */
export type PaymentsMode = "mock" | "rollypay" | "off";

export function paymentsMode(): PaymentsMode {
  const value = process.env.NEXT_PUBLIC_PAYMENTS_MODE;
  if (value === "mock" || value === "rollypay" || value === "off") return value;
  return process.env.NODE_ENV === "production" ? "off" : "mock";
}

/** Секреты и настройки сервера. Читаются из окружения воркера (wrangler secrets, .dev.vars). */
export type ServerEnv = {
  ROLLYPAY_API_KEY?: string;
  ROLLYPAY_SIGNING_SECRET?: string;
  ROLLYPAY_BASE_URL?: string;
  ROLLYPAY_TEST?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};
