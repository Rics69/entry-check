import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { formatRulesJson } from "@/lib/rules/format";
import type { Requirement } from "@/lib/rules/types";

/**
 * Только для `next dev`: в продакшне всегда 404 (на Workers и нет файловой системы для записи).
 * Отмечает правило проверенным или возвращает в черновики — прямо в data/requirements/<ЗОНА>.json.
 */

const RULES_DIR = join(process.cwd(), "data", "requirements");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

type Body = { id?: unknown; action?: unknown };

/** Защита от записи с других машин в сети: next dev слушает все интерфейсы. */
function isLocalSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  if (!LOCAL_HOSTS.has(host.replace(/:\d+$/, ""))) return false;
  const origin = request.headers.get("origin");
  return origin === null || origin === `http://${host}`;
}

/** Сегодняшняя дата по часам компьютера: "2026-11-09". */
function localToday(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development" || !isLocalSameOrigin(request)) {
    return new NextResponse(null, { status: 404 });
  }

  const { id, action } = (await request.json().catch(() => ({}))) as Body;
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id) || (action !== "verify" && action !== "unverify")) {
    return NextResponse.json({ error: "Нужны id правила и action: verify | unverify" }, { status: 400 });
  }

  for (const file of (await readdir(RULES_DIR)).filter((f) => f.endsWith(".json"))) {
    const path = join(RULES_DIR, file);
    const rules = JSON.parse(await readFile(path, "utf8")) as Requirement[];
    const rule = rules.find((r) => r.id === id);
    if (!rule) continue;

    if (action === "verify") {
      rule.verifiedAt = localToday();
      // Подсказка для проверяющего больше не нужна; в истории git она останется.
      delete rule.draftNote;
    } else {
      rule.verifiedAt = null;
    }

    await writeFile(path, formatRulesJson(rules));
    return NextResponse.json({ ok: true, id, file: `data/requirements/${file}`, verifiedAt: rule.verifiedAt });
  }

  return NextResponse.json({ error: `Правило ${id} не найдено` }, { status: 404 });
}
