import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RulesReview } from "@/components/dev/rules-review";
import { DESTINATIONS } from "@/data/destinations";
import type { Requirement } from "@/lib/rules/types";

// Только для `next dev`: в продакшне — 404. Изменения пишет /api/dev/rules.
// Читаем JSON с диска на каждый запрос: после «Проверено» страница сразу показывает новое состояние.
export const dynamic = "force-dynamic";

export const metadata: Metadata =
  process.env.NODE_ENV === "development" ? { title: "Сверка правил — Entry Check" } : {};

const ZONE_ORDER = Object.keys(DESTINATIONS);

function readRules(): Requirement[] {
  const dir = join(process.cwd(), "data", "requirements");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => ZONE_ORDER.indexOf(a.replace(".json", "")) - ZONE_ORDER.indexOf(b.replace(".json", "")))
    .flatMap((file) => JSON.parse(readFileSync(join(dir, file), "utf8")) as Requirement[]);
}

function localToday(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function RulesReviewPage() {
  // Внутренний инструмент: на проде страницы нет.
  if (process.env.NODE_ENV !== "development") notFound();
  return <RulesReview rules={readRules()} today={localToday()} />;
}
