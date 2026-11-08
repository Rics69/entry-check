/**
 * Канонический формат data/requirements/*.json.
 * Короткие значения — в одну строку, длинные тексты — по строке на язык.
 * Страница сверки записывает файлы этим форматом, поэтому дифф в git — только изменённые строки.
 * Без зависимостей и алиасов: запускается и из Next.js, и напрямую через node (scripts/rules-format.mjs).
 */

const MAX_LINE = 160;
const INDENT = "  ";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** Значение в одну строку с пробелами: { "ru": "…", "en": "…" }, ["US", "GB"]. */
function inline(value: Json): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`).join(", ")} }`;
}

function format(value: Json, depth: number, prefixLength: number, forceMultiline = false): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const flat = inline(value);
  if (!forceMultiline && prefixLength + flat.length <= MAX_LINE) return flat;

  const pad = INDENT.repeat(depth + 1);
  const close = INDENT.repeat(depth);
  if (Array.isArray(value)) {
    const items = value.map((item) => pad + format(item, depth + 1, pad.length, depth === 0));
    return `[\n${items.join(",\n")}\n${close}]`;
  }
  const lines = Object.entries(value).map(([key, item]) => {
    const head = `${pad}${JSON.stringify(key)}: `;
    return head + format(item, depth + 1, head.length);
  });
  return `{\n${lines.join(",\n")}\n${close}}`;
}

/** Массив правил → текст файла (с переводом строки в конце). */
export function formatRulesJson(rules: unknown[]): string {
  return `${format(rules as Json, 0, 0, true)}\n`;
}
