#!/usr/bin/env node
// Отчёт о состоянии базы правил: черновики (verifiedAt: null) и устаревшие проверки (> 30 дней).
//
//   npm run rules:report   — показать список, код выхода 0
//   npm run rules:check    — то же, но код выхода 1, если есть черновики или устаревшие правила (для CI и деплоя)

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STALE_DAYS = 30;
const strict = process.argv.includes("--strict");
const dir = join(import.meta.dirname, "..", "data", "requirements");

const today = new Date().toISOString().slice(0, 10);
const daysSince = (date) => Math.floor((Date.parse(today) - Date.parse(date)) / 86_400_000);

const drafts = [];
const stale = [];
let total = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const rules = JSON.parse(readFileSync(join(dir, file), "utf8"));
  for (const rule of rules) {
    total += 1;
    if (rule.verifiedAt === null) drafts.push(rule);
    else if (daysSince(rule.verifiedAt) > STALE_DAYS) stale.push(rule);
  }
}

console.log(`Правил всего: ${total}. Проверено и свежее: ${total - drafts.length - stale.length}.`);

if (drafts.length) {
  console.log(`\nЧерновики — нужна сверка с первоисточником (${drafts.length}):`);
  let zone = "";
  for (const rule of drafts) {
    if (rule.destination !== zone) {
      zone = rule.destination;
      console.log(`\n  ${zone}`);
    }
    console.log(`    • ${rule.id} — ${rule.name.ru}`);
    console.log(`      ${rule.source}`);
    if (rule.draftNote) console.log(`      ↳ ${rule.draftNote}`);
  }
}

if (stale.length) {
  console.log(`\nПроверены больше ${STALE_DAYS} дней назад (${stale.length}):`);
  for (const rule of stale) {
    console.log(`    • ${rule.id} — проверено ${rule.verifiedAt} (${daysSince(rule.verifiedAt)} дн.)`);
  }
}

if (strict && (drafts.length || stale.length)) {
  console.error("\nrules:check: есть непроверенные или устаревшие правила — сборка для продакшна остановлена.");
  process.exit(1);
}
