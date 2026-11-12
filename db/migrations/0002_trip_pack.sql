-- Trip Pack: оплата, напоминания, письма.

-- Кто принял оплату: mock (заглушка для тестов сайта) или rollypay.
ALTER TABLE orders ADD COLUMN provider TEXT;
-- Отпечатки правил маршрута на момент покупки: {"th-tdac": "a1b2c3d4", ...}.
-- По ним видно, что правило изменилось после оплаты (письмо и пометка на странице поездки).
ALTER TABLE orders ADD COLUMN rules_snapshot TEXT;
-- Когда отправлен чек-лист и поставлены напоминания. Пусто у оплаченного заказа — значит, обработка
-- оборвалась, и повторный колбэк RollyPay её довыполнит.
ALTER TABLE orders ADD COLUMN fulfilled_at TEXT;
CREATE INDEX idx_orders_status ON orders (status);

-- Данные напоминания: какое правило, какая точка маршрута.
ALTER TABLE reminders ADD COLUMN payload TEXT;

-- Письма, пока не подключён Resend: всё, что «отправлено», лежит здесь и видно на /dev/emails.
CREATE TABLE outbox (
  id            TEXT PRIMARY KEY,
  to_email      TEXT NOT NULL,
  subject       TEXT NOT NULL,
  html          TEXT NOT NULL,
  text          TEXT NOT NULL,
  scheduled_at  TEXT,
  status        TEXT NOT NULL,          -- sent | scheduled | canceled
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_outbox_created ON outbox (created_at);
