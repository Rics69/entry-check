#!/usr/bin/env node
// Приводит data/requirements/*.json к каноническому формату (тому же, которым пишет страница /dev/rules).
// Запускать после ручной правки JSON, чтобы дифф в git оставался аккуратным:  npm run rules:format

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatRulesJson } from "../lib/rules/format.ts";

const dir = join(import.meta.dirname, "..", "data", "requirements");
let changed = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const path = join(dir, file);
  const before = readFileSync(path, "utf8");
  const after = formatRulesJson(JSON.parse(before));
  if (after !== before) {
    writeFileSync(path, after);
    changed += 1;
    console.log(`  отформатирован ${file}`);
  }
}

console.log(changed ? `Готово: ${changed} файл(ов).` : "Все файлы уже в каноническом формате.");
