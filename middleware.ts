import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Только выбор языка: / → /ru или /en по браузеру и cookie.
//
// Почему middleware.ts, а не proxy.ts: в Next.js 16 proxy работает только в Node.js-рантайме,
// а его поддержка в OpenNext для Cloudflare экспериментальная. Next.js документирует:
// «если нужен edge-рантайм, оставайтесь на middleware». Edge-middleware OpenNext поддерживает штатно.
// Next.js при сборке пишет предупреждение об устаревшем имени — это ожидаемо.
export default createMiddleware(routing);

export const config = {
  // Всё, кроме API, внутренних инструментов (/dev — в продакшне 404),
  // служебных путей Next.js и файлов с расширением.
  matcher: "/((?!api|dev(?:/|$)|_next|_vercel|.*\\..*).*)",
};
