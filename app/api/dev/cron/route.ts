import { NextResponse, type NextRequest } from "next/server";
import { requestDeps } from "@/lib/deps";
import { runDaily } from "@/lib/reminders";

/**
 * Только для `next dev`: запускает то же, что ежедневный cron в worker.ts. В продакшне — 404.
 * Принимает запросы только с этого компьютера, как и /api/dev/rules.
 */
export async function POST(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").replace(/:\d+$/, "");
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json(await runDaily(await requestDeps()));
}
