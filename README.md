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
| `npm run dev` → [localhost:3000/dev/rules](http://localhost:3000/dev/rules) | **Страница сверки правил**: матрица «паспорт × страна», фильтры, карточки со ссылками и кнопкой «Проверено» (пишет дату в JSON). Только в dev, на проде — 404 |
| `npm run rules:report` | Список непроверенных и устаревших правил с подсказками, что сверить |
| `npm run rules:format` | Привести `data/requirements/*.json` к единому формату после ручной правки |
| `npm run rules:check` | То же, но с ошибкой, если такие есть, — для CI перед продакшн-деплоем |
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
data/requirements/   правила въезда: один JSON на зону (TH.json, SCHENGEN.json…)
data/                страны, зоны, охват MVP, официальные домены
lib/rules/           движок проверки, окна подачи, сверка доменов, валидация
lib/trip-codec.ts    маршрут ↔ параметр ?d=
lib/                 db.ts (D1), site.ts; позже — RollyPay, Resend
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
- **Тексты только в `messages/`.** Тест `tests/messages.test.ts` следит, чтобы RU и EN совпадали по ключам и плейсхолдерам.
