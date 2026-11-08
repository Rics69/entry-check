# Entry Check

Паспорт + маршрут → всё, что нужно для въезда, на одном экране. Только официальные ссылки.

План по фазам и текущий статус — в [docs/DEV_PLAN.md](docs/DEV_PLAN.md).

## Стек

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · next-intl (`/ru`, `/en`) ·
Cloudflare Workers через OpenNext · D1 · Vitest.

## Быстрый старт

```bash
npm install
cp .env.example .env.local        # публичные переменные сборки
cp .dev.vars.example .dev.vars    # секреты воркера (можно оставить пустыми до фазы 5)
npm run db:migrate:local          # локальная база D1 в .wrangler/
npm run dev                       # http://localhost:3000
```

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Дев-сервер Next.js с биндингами Cloudflare (D1) |
| `npm run check` | Линт + проверка типов + тесты — запускать перед каждым коммитом |
| `npm run test` | Юнит-тесты (Vitest) |
| `npm run build` | Обычная сборка Next.js |
| `npm run preview` | Сборка под Cloudflare и запуск в локальном workerd — ближе всего к продакшну |
| `npm run deploy` | Сборка и деплой на Cloudflare |
| `npm run cf-typegen` | Пересоздать `cloudflare-env.d.ts` после правки `wrangler.jsonc` |
| `npm run db:migrate:local` / `db:migrate:remote` | Применить миграции D1 локально / на проде |

## Структура

```text
app/[locale]/        страницы (лендинг, позже — проверка, поездка, оплата)
components/          шапка, подвал, блоки лендинга
i18n/                маршрутизация и загрузка переводов next-intl
messages/{ru,en}.json  все тексты интерфейса
lib/                 db.ts (D1), site.ts; позже — движок правил, RollyPay, Resend
db/migrations/       SQL-миграции D1
middleware.ts        выбор языка: / → /ru или /en
tests/               тесты, не привязанные к одному модулю
```

## Почему так

- **`middleware.ts`, а не `proxy.ts`.** В Next.js 16 proxy работает только в Node.js-рантайме, а его поддержка в OpenNext для Cloudflare экспериментальная. Edge-middleware поддерживается штатно. Предупреждение Next.js об устаревшем имени при сборке — ожидаемо.
- **`cacheComponents` выключен.** Next.js гарантирует его только в Node.js-рантайме, а мы на Workers.
- **Тексты только в `messages/`.** Тест `tests/messages.test.ts` следит, чтобы RU и EN совпадали по ключам и плейсхолдерам.
