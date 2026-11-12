"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { flagEmoji, getCountry } from "@/data/countries";
import { COVERAGE } from "@/data/coverage";
import { DESTINATIONS } from "@/data/destinations";
import { evaluateTrip, requirementStatus } from "@/lib/rules/engine";
import type { Requirement, RequirementKind, Status, ZoneCode } from "@/lib/rules/types";
import { addDays } from "@/lib/rules/windows";

const STALE_DAYS = 30;

type Review = "draft" | "stale" | "verified";
type ReviewFilter = "all" | Review;

const KIND_LABEL: Record<RequirementKind, string> = {
  visa_free: "Безвиз",
  eta: "ETA",
  evisa: "e-Visa",
  visa_on_arrival: "Виза по прилёте",
  visa: "Виза",
  arrival_card: "Карта прибытия",
  levy: "Сбор",
  info: "Справка",
};

const STATUS_STYLE: Record<Status, { cell: string; bar: string; icon: string; label: string }> = {
  green: { cell: "bg-ok-soft text-ok border-ok/40", bar: "bg-ok", icon: "✓", label: "ничего не нужно" },
  yellow: { cell: "bg-warn-soft text-warn border-warn/40", bar: "bg-warn", icon: "◐", label: "форма, сбор или виза по прилёте" },
  red: { cell: "bg-stop-soft text-stop border-stop/40", bar: "bg-stop", icon: "●", label: "разрешение заранее" },
  unknown: { cell: "bg-background text-subtle border-border-strong", bar: "bg-subtle", icon: "?", label: "нет данных" },
};

function reviewOf(rule: Requirement, today: string): Review {
  if (rule.verifiedAt === null) return "draft";
  return addDays(rule.verifiedAt, STALE_DAYS) < today ? "stale" : "verified";
}

const countryLabel = (code: string) => `${flagEmoji(code)} ${getCountry(code)?.name.ru ?? code}`;
const zoneOfPair = (zone: ZoneCode) => (zone === "SCHENGEN" ? "FR" : zone);

function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

function formatFee(fee: Requirement["fee"]): string | null {
  if (!fee) return null;
  if (fee.amount === 0) return "Бесплатно";
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: fee.currency, maximumFractionDigits: 2 }).format(fee.amount);
}

function appliesToPassport(rule: Requirement, passport: string): boolean {
  const { passports, except } = rule.appliesTo;
  if (except?.includes(passport)) return false;
  return passports === "ALL" || passports.includes(passport);
}

export function RulesReview({ rules, today }: { rules: Requirement[]; today: string }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [zone, setZone] = useState<ZoneCode | "all">("all");
  const [passport, setPassport] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [matrixDate, setMatrixDate] = useState(() => addDays(today, 30));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: rules.length, draft: 0, stale: 0, verified: 0 };
    for (const rule of rules) c[reviewOf(rule, today)] += 1;
    return c;
  }, [rules, today]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((rule) => {
      if (reviewFilter !== "all" && reviewOf(rule, today) !== reviewFilter) return false;
      if (zone !== "all" && rule.destination !== zone) return false;
      if (passport !== "all" && !appliesToPassport(rule, passport)) return false;
      if (q && !`${rule.id} ${rule.name.ru} ${rule.name.en} ${rule.draftNote ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rules, today, reviewFilter, zone, passport, query]);

  const groups = useMemo(() => {
    const byZone = new Map<ZoneCode, Requirement[]>();
    for (const rule of visible) byZone.set(rule.destination, [...(byZone.get(rule.destination) ?? []), rule]);
    return [...byZone.entries()];
  }, [visible]);

  async function setVerified(id: string, action: "verify" | "unverify") {
    setPendingId(id);
    setError(null);
    try {
      const response = await fetch("/api/dev/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Ошибка ${response.status}`);
      }
      startRefresh(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPendingId(null);
    }
  }

  function focusPair(p: string, z: ZoneCode) {
    setPassport(p);
    setZone(z);
    setReviewFilter("all");
    setQuery("");
    document.getElementById("rules")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const resetFilters = () => {
    setReviewFilter("all");
    setZone("all");
    setPassport("all");
    setQuery("");
  };

  const done = counts.verified;
  const progress = counts.all ? Math.round((done / counts.all) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Шапка и прогресс */}
      <header className="flex flex-col gap-4">
        <p className="text-sm text-muted">Entry Check · только в режиме разработки</p>
        <h1 className="text-3xl font-semibold tracking-tight">Сверка правил въезда</h1>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span>
              <strong className="text-2xl font-semibold">{done}</strong>
              <span className="text-muted"> из {counts.all} проверено</span>
            </span>
            <span className="text-muted">
              Черновики: {counts.draft} · Устарели (&gt; {STALE_DAYS} дней): {counts.stale}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <details className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed" open={done === 0}>
          <summary className="cursor-pointer font-medium">Как сверять</summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted">
            <li>Откройте «Первоисточник» и «Официальную ссылку» в карточке правила.</li>
            <li>Сверьте каждое поле. Если что-то не так — поправьте JSON-файл (путь указан у страны) и обновите эту страницу.</li>
            <li>Нажмите «Проверено»: в <code>verifiedAt</code> запишется сегодняшняя дата, подсказка «Что проверить» удалится.</li>
            <li>В конце: <code>npm run check</code> и коммит. Правила без отметки в продакшн не попадут.</li>
          </ol>
        </details>
      </header>

      {/* Матрица охвата */}
      <section className="mt-10" aria-labelledby="matrix-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="matrix-title" className="text-xl font-semibold">Что увидит путешественник</h2>
            <p className="mt-1 text-sm text-muted">Результат проверки для каждой пары. Нажмите на клетку — внизу останутся только её правила.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Дата прилёта</span>
            <input
              type="date"
              value={matrixDate}
              onChange={(e) => e.target.value && setMatrixDate(e.target.value)}
              className="h-10 rounded-lg border border-border-strong bg-surface px-3"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          {(Object.keys(STATUS_STYLE) as Status[]).map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className={`flex size-6 items-center justify-center rounded border text-xs ${STATUS_STYLE[s].cell}`}>{STATUS_STYLE[s].icon}</span>
              {STATUS_STYLE[s].label}
            </span>
          ))}
          <span className="flex items-center gap-2">
            <span className="size-6 rounded border border-dashed border-foreground/50" />
            есть непроверенные правила
          </span>
        </div>

        <div className="mt-4 grid gap-6">
          {(Object.entries(COVERAGE) as ["ru" | "en", (typeof COVERAGE)["ru"]][]).map(([track, cov]) => (
            <CoverageTable key={track} track={track} passports={cov.passports} zones={cov.zones} rules={rules} date={matrixDate} today={today} onPick={focusPair} active={{ passport, zone }} />
          ))}
        </div>
      </section>

      {/* Фильтры */}
      <section id="rules" className="mt-12 scroll-mt-4" aria-labelledby="rules-title">
        <h2 id="rules-title" className="text-xl font-semibold">Правила</h2>

        <div className="sticky top-0 z-10 -mx-4 mt-4 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex rounded-lg border border-border bg-surface p-0.5 text-sm" role="tablist">
            {(["all", "draft", "stale", "verified"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={reviewFilter === f}
                onClick={() => setReviewFilter(f)}
                className={`h-9 rounded-md px-3 transition-colors ${reviewFilter === f ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
              >
                {{ all: "Все", draft: "Черновики", stale: "Устарели", verified: "Проверены" }[f]} {counts[f]}
              </button>
            ))}
          </div>
          <select value={zone} onChange={(e) => setZone(e.target.value as ZoneCode | "all")} className="h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm" aria-label="Страна назначения">
            <option value="all">Все направления</option>
            {Object.values(DESTINATIONS).map((d) => (
              <option key={d.code} value={d.code}>{d.name.ru}</option>
            ))}
          </select>
          <select value={passport} onChange={(e) => setPassport(e.target.value)} className="h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm" aria-label="Паспорт">
            <option value="all">Все паспорта</option>
            {[...COVERAGE.ru.passports, ...COVERAGE.en.passports].map((code) => (
              <option key={code} value={code}>{countryLabel(code)}</option>
            ))}
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: id, название, подсказка"
            className="h-10 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-3 text-sm"
          />
          <button type="button" onClick={resetFilters} className="h-10 rounded-lg px-3 text-sm text-accent hover:underline">
            Сбросить
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-stop/40 bg-stop-soft px-4 py-3 text-sm text-stop">
            Не удалось сохранить: {error}
          </p>
        )}

        {groups.length === 0 && <p className="mt-8 text-muted">Под фильтры ничего не подошло.</p>}

        <div className={`mt-6 flex flex-col gap-10 transition-opacity ${isRefreshing ? "opacity-60" : ""}`}>
          {groups.map(([z, list]) => {
            const all = rules.filter((r) => r.destination === z);
            const verified = all.filter((r) => reviewOf(r, today) === "verified").length;
            return (
              <section key={z} aria-labelledby={`zone-${z}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                  <h3 id={`zone-${z}`} className="text-lg font-semibold">
                    {z === "SCHENGEN" ? "🇪🇺" : flagEmoji(z)} {DESTINATIONS[z].name.ru}
                  </h3>
                  <span className="text-sm text-muted">
                    <code>data/requirements/{z}.json</code> · проверено {verified} из {all.length}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  {list.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} review={reviewOf(rule, today)} pending={pendingId === rule.id} onAction={setVerified} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CoverageTable(props: {
  track: "ru" | "en";
  passports: readonly string[];
  zones: ZoneCode[];
  rules: Requirement[];
  date: string;
  today: string;
  active: { passport: string; zone: ZoneCode | "all" };
  onPick: (passport: string, zone: ZoneCode) => void;
}) {
  const { track, passports, zones, rules, date, active, onPick } = props;
  const now = useMemo(() => new Date(`${props.today}T00:00:00Z`), [props.today]);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-medium">Трек {track.toUpperCase()}</p>
      <table className="border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th />
            {zones.map((z) => (
              <th key={z} scope="col" className="px-0.5 text-center font-normal text-muted" title={DESTINATIONS[z].name.ru}>
                {z === "SCHENGEN" ? "SCH" : z}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {passports.map((p) => (
            <tr key={p}>
              <th scope="row" className="pr-2 text-left font-normal whitespace-nowrap" title={getCountry(p)?.name.ru}>
                {flagEmoji(p)} {p}
              </th>
              {zones.map((z) => {
                const stop = evaluateTrip({ passport: p, stops: [{ country: zoneOfPair(z), date }] }, { now, rules }).stops[0];
                const used = [...(stop.entry ? [stop.entry] : []), ...stop.extras];
                const style = STATUS_STYLE[stop.status];
                const isActive = active.passport === p && active.zone === z;
                const title = `${getCountry(p)?.name.ru} → ${DESTINATIONS[z].name.ru}: ${style.label}` +
                  (stop.home ? " (страна гражданства)" : "") +
                  (used.length ? `\n${used.map((i) => `${i.requirement.id}${i.draft ? " — черновик" : ""}`).join("\n")}` : "");
                return (
                  <td key={z}>
                    <button
                      type="button"
                      onClick={() => onPick(p, z)}
                      title={title}
                      aria-label={title}
                      className={`flex size-8 items-center justify-center rounded border text-xs transition-transform hover:scale-110 ${style.cell} ${stop.draft ? "border-dashed" : ""} ${isActive ? "ring-2 ring-accent ring-offset-1" : ""}`}
                    >
                      {stop.home ? "⌂" : style.icon}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RuleCard({ rule, review, pending, onAction }: {
  rule: Requirement;
  review: Review;
  pending: boolean;
  onAction: (id: string, action: "verify" | "unverify") => void;
}) {
  const status = requirementStatus(rule);
  const fields: [string, string][] = [];
  const passports = rule.appliesTo.passports;
  fields.push(["Кому", passports === "ALL" ? "Все паспорта" : passports.map(countryLabel).join(", ")]);
  if (rule.appliesTo.except?.length) fields.push(["Кроме", rule.appliesTo.except.map(countryLabel).join(", ")]);
  const fee = formatFee(rule.fee);
  if (fee) fields.push(["Сбор", fee]);
  if (rule.stayLimitDays) fields.push(["Срок пребывания", `до ${rule.stayLimitDays} дней`]);
  if (rule.windowHoursBeforeArrival) fields.push(["Окно подачи", `за ${rule.windowHoursBeforeArrival} ч до прилёта`]);
  if (rule.windowDaysBeforeArrival) {
    fields.push(["Окно подачи", `${rule.windowDaysBeforeArrival} календарных дня, включая день прилёта (по времени страны)`]);
  }
  if (rule.recommendDaysBeforeArrival) fields.push(["Подать заранее", `за ${rule.recommendDaysBeforeArrival} дн. до прилёта`]);
  if (rule.processing) fields.push(["Рассмотрение", rule.processing.ru]);
  if (rule.passportValidity) fields.push(["Паспорт", rule.passportValidity.ru]);
  if (rule.onwardTicketMayBeAsked) fields.push(["Обратный билет", "могут спросить"]);
  if (rule.appliesToTransit) fields.push(["Транзит", "нужно и при пересадке"]);
  if (rule.validFrom || rule.validUntil) {
    fields.push(["Действует", [rule.validFrom && `с ${formatDate(rule.validFrom)}`, rule.validUntil && `по ${formatDate(rule.validUntil)}`].filter(Boolean).join(" ")]);
  }

  const pill = {
    draft: "bg-warn-soft text-warn",
    stale: "bg-stop-soft text-stop",
    verified: "bg-ok-soft text-ok",
  }[review];
  const pillText = {
    draft: "Черновик",
    stale: `Устарело · ${rule.verifiedAt && formatDate(rule.verifiedAt)}`,
    verified: `Проверено ${rule.verifiedAt && formatDate(rule.verifiedAt)}`,
  }[review];

  return (
    <article className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 pl-6">
      <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_STYLE[status].bar}`} aria-hidden="true" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-md border px-2 py-0.5 ${STATUS_STYLE[status].cell}`}>{KIND_LABEL[rule.kind]}</span>
            <code className="text-muted">{rule.id}</code>
          </div>
          <h4 className="mt-2 text-lg font-semibold">{rule.name.ru}</h4>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${pill}`}>{pillText}</span>
      </div>

      {rule.draftNote && review === "draft" && (
        <p className="mt-4 rounded-lg bg-warn-soft px-4 py-3 text-sm leading-relaxed text-foreground">
          <strong className="font-medium text-warn">Что проверить: </strong>
          {rule.draftNote}
        </p>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {rule.notes && (
        <div className="mt-4 text-sm leading-relaxed">
          <p>{rule.notes.ru}</p>
          <details className="mt-2 text-muted">
            <summary className="cursor-pointer">Английская версия</summary>
            <p className="mt-1"><strong className="font-medium">{rule.name.en}.</strong> {rule.notes.en}</p>
          </details>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <a href={rule.source} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border border-border-strong px-3 text-sm hover:bg-background">
          Первоисточник ↗
        </a>
        <a href={rule.officialUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border border-border-strong px-3 text-sm hover:bg-background">
          Официальная ссылка ↗
        </a>
        <span className="hidden min-w-0 flex-1 truncate text-xs text-subtle sm:block" title={rule.officialUrl}>{rule.officialUrl}</span>
        <div className="ml-auto flex gap-2">
          {review !== "draft" && (
            <button type="button" disabled={pending} onClick={() => onAction(rule.id, "unverify")} className="h-10 rounded-lg px-3 text-sm text-muted hover:text-foreground disabled:opacity-50">
              Вернуть в черновики
            </button>
          )}
          {review !== "verified" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onAction(rule.id, "verify")}
              className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent shadow-sm transition hover:-translate-y-px hover:bg-accent-hover disabled:translate-y-0 disabled:opacity-50"
            >
              {pending ? "Сохраняю…" : review === "stale" ? "Проверено заново" : "✓ Проверено"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
