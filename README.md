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
cp .dev.vars.example .dev.vars    # секреты воркера (можно оставить пустыми — оплата и почта на заглушках)
npm run db:migrate:local          # локальная база D1 в .wrangler/
npm run dev                       # http://localhost:3000
```

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Дев-сервер Next.js с биндингами Cloudflare (D1) |
| `npm run check` | Линт + проверка типов + тесты — запускать перед каждым коммитом |
| `npm run test` | Юнит-тесты (Vitest) |
| `npm run dev` → [localhost:3000/dev/rules](http://localhost:3000/dev/rules) | **Страница сверки правил**: матрица «паспорт × страна», фильтры, карточки со ссылками и кнопкой «Проверено» (пишет дату в JSON). Только в dev, на проде — 404 |
| `npm run dev` → [localhost:3000/dev/emails](http://localhost:3000/dev/emails) | **Письма**: всё, что отправлено или запланировано без ключа Resend (таблица `outbox`), с предпросмотром. Кнопка «Запустить ежедневный cron». Только в dev |
| `npm run rules:report` | Список непроверенных и устаревших правил с подсказками, что сверить |
| `npm run rules:format` | Привести `data/requirements/*.json` к единому формату после ручной правки |
| `npm run rules:check` | То же, но с ошибкой, если такие есть, — для CI перед продакшн-деплоем |
| `npm run build` | Обычная сборка Next.js |
| `npm run preview` | Сборка под Cloudflare и запуск в локальном workerd — ближе всего к продакшну |
| `npm run deploy` | Сборка и деплой на Cloudflare |
| `npm run cf-typegen` | Пересоздать `cloudflare-env.d.ts` после правки `wrangler.jsonc` |
| `npm run db:migrate:local` / `db:migrate:remote` | Применить миграции D1 локально / на проде |

## Оплата и письма

Режим оплаты задаёт `NEXT_PUBLIC_PAYMENTS_MODE` в `.env.local`. Переменная попадает в сборку, поэтому на продакшне её нужно задавать до `npm run deploy`.

| Режим | Что происходит |
| --- | --- |
| `mock` (по умолчанию в dev) | Тестовая касса на своём сайте: `/pay/mock` с кнопками «Оплатить (тест)» и «Отказаться». Дальше всё как с настоящей оплатой: колбэк, чек-лист, напоминания |
| `rollypay` | Настоящая касса RollyPay. Нужны секреты `ROLLYPAY_API_KEY` и `ROLLYPAY_SIGNING_SECRET`, а для тестовых платежей — `ROLLYPAY_TEST=true` |
| `off` (по умолчанию в продакшне) | Кнопки оплаты нет, вместо неё лист ожидания |

Почта: с `RESEND_API_KEY` письма уходят через Resend, без ключа складываются в `outbox` (смотреть на `/dev/emails`).

Напоминания, до которых меньше 29 дней, сразу ставятся в очередь Resend (`scheduled_at`). Остальные ставит ежедневный cron из `worker.ts` (`0 6 * * *` UTC). Он же присылает письмо, если правила по оплаченному маршруту изменились.

Секреты в продакшне: `npx wrangler secret put ROLLYPAY_API_KEY` (и так же `ROLLYPAY_SIGNING_SECRET`, `RESEND_API_KEY`). URL вебхука для кабинета RollyPay: `https://<домен>/api/webhooks/rollypay`.

## Структура

```text
app/[locale]/        страницы: лендинг, проверка, результат, оплата, оплаченная поездка и её печать
app/api/             заказы, вебхук RollyPay, тестовая касса, события, лист ожидания
components/          шапка, подвал, лендинг, проверка, поездка, оплата
i18n/                маршрутизация и загрузка переводов next-intl
messages/{ru,en}.json  все тексты интерфейса
data/requirements/   правила въезда: один JSON на зону (TH.json, SCHENGEN.json…)
data/                страны, зоны, охват MVP, официальные домены
lib/rules/           движок проверки, окна подачи, сверка доменов, валидация
lib/trip-codec.ts    маршрут ↔ параметр ?d=
lib/payments/        клиент RollyPay и проверка подписи колбэков
lib/email/           Resend или outbox, шаблоны писем RU/EN
lib/orders.ts        заказ, статусы оплаты, выдача Trip Pack
lib/reminders.ts     план напоминаний, ежедневный cron, письма об изменении правил
worker.ts            точка входа Worker: fetch от OpenNext + cron
db/migrations/       SQL-миграции D1
middleware.ts        выбор языка: / → /ru или /en
tests/               тесты, не привязанные к одному модулю
```

## Почему так

- **`middleware.ts`, а не `proxy.ts`.** В Next.js 16 proxy работает только в Node.js-рантайме, а его поддержка в OpenNext для Cloudflare экспериментальная. Edge-middleware поддерживается штатно. Предупреждение Next.js об устаревшем имени при сборке — ожидаемо.
- **`cacheComponents` выключен.** Next.js гарантирует его только в Node.js-рантайме, а мы на Workers.
- **Правила — в git, а не в базе.** Каждая правка проходит ревью и остаётся в истории. Движок — чистая функция и считает в браузере, без запросов к серверу.
- **Черновик не попадает в продакшн.** Правило с `verifiedAt: null` движок в продакшн-сборке не видит. Для закрытого превью: `NEXT_PUBLIC_INCLUDE_DRAFT_RULES=true`.
- **Попап проверки — перехват маршрутов.** `app/[locale]/@modal/(.)check` показывает форму поверх страницы, `/check` по прямой ссылке — отдельной страницей. После добавления или переименования файлов в `@modal` перезапускайте `npm run dev`: дев-сервер Next.js 16 не всегда подхватывает новые параллельные маршруты на лету.
- **Свой `worker.ts`.** OpenNext даёт только `fetch`, а ежедневным напоминаниям нужен `scheduled`. Поэтому `wrangler.jsonc` указывает на `worker.ts`, который отдаёт `fetch` из `.open-next/worker.js` и добавляет cron. Проверить локально: `npm run cf:build`, затем `npx wrangler dev --test-scheduled` и `curl "localhost:8787/__scheduled?cron=0+6+*+*+*"`.
- **Колбэк кассы — единственный источник правды об оплате.** Страница успеха только ждёт, пока колбэк отметит заказ. Повтор колбэка ничего не дублирует, а если письмо не ушло, повторный колбэк доделывает заказ.
- **Тесты с D1 — на встроенном SQLite Node.js** (`tests/helpers/fake-d1.ts`) с настоящими миграциями.
- **Тексты только в `messages/`.** Тест `tests/messages.test.ts` следит, чтобы RU и EN совпадали по ключам и плейсхолдерам.
