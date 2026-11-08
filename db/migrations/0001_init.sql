-- Entry Check: начальная схема D1 (SQLite).
-- Даты храним строками ISO 8601 в UTC: "2026-11-08T12:00:00.000Z".

-- Заказы Trip Pack. trip_json — маршрут в том же формате, что и параметр ?d=.
CREATE TABLE orders (
  id          TEXT PRIMARY KEY,
  payment_id  TEXT UNIQUE,
  status      TEXT NOT NULL,          -- created | paid | canceled | expired | refunded | chargeback
  email       TEXT NOT NULL,
  locale      TEXT NOT NULL,          -- ru | en
  trip_json   TEXT NOT NULL,
  amount      TEXT NOT NULL,          -- "490.00" | "6.99"
  currency    TEXT NOT NULL,          -- RUB | EUR
  created_at  TEXT NOT NULL,
  paid_at     TEXT
);

-- Журнал колбэков RollyPay. Первичный ключ даёт идемпотентность:
-- повтор того же (payment_id, status) ничего не делает.
CREATE TABLE payment_events (
  payment_id  TEXT NOT NULL,
  status      TEXT NOT NULL,
  received_at TEXT NOT NULL,
  raw         TEXT NOT NULL,
  PRIMARY KEY (payment_id, status)
);

-- Напоминания. Если до отправки меньше 30 дней — письмо сразу ставится в Resend
-- (resend_id заполнен). Иначе ждёт здесь, и ежедневный cron поставит его позже.
CREATE TABLE reminders (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id),
  kind        TEXT NOT NULL,          -- window_open | recheck_72h
  send_at     TEXT NOT NULL,
  resend_id   TEXT,
  status      TEXT NOT NULL           -- pending | scheduled | sent | canceled
);
CREATE INDEX idx_reminders_due ON reminders (status, send_at);
CREATE INDEX idx_reminders_order ON reminders (order_id);

-- События воронки: check_open, check_result, official_click, site_check,
-- buy_click, order_paid, pass_waitlist, share.
CREATE TABLE events (
  name    TEXT NOT NULL,
  locale  TEXT NOT NULL,
  ref     TEXT,                       -- источник перехода: reddit | x | tg | ...
  props   TEXT,                       -- JSON
  ts      TEXT NOT NULL
);
CREATE INDEX idx_events_name_ts ON events (name, ts);

-- «Сообщить о запуске» Traveler Pass.
CREATE TABLE waitlist (
  email   TEXT NOT NULL,
  locale  TEXT NOT NULL,
  source  TEXT,
  ts      TEXT NOT NULL
);
