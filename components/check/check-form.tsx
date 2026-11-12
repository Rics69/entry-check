"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ALL_PASSPORTS,
  DESTINATION_COUNTRIES,
  PASSPORTS,
  POPULAR_DESTINATIONS,
  flagEmoji,
  getCountry,
  type Country,
} from "@/data/countries";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { track } from "@/lib/analytics";
import {
  draftsToTrip,
  emptyStop,
  localToday,
  maxDate,
  tripToDrafts,
  validateStops,
  type StopDraft,
  type StopErrors,
} from "@/lib/check-form";
import { SUPPORT_EMAIL } from "@/lib/site";
import { MAX_STOPS, decodeTrip, encodeTrip } from "@/lib/trip-codec";

type Step = "passport" | "route";

const INPUT =
  "h-12 w-full rounded-lg border border-border-strong bg-background px-3.5 text-base transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none aria-[invalid=true]:border-stop";

/**
 * Проверка маршрута в два шага: паспорт → точки маршрута → /trip?d=…
 * Одна форма для попапа поверх лендинга и для отдельной страницы /check.
 * Предзаполнение: ?d=<маршрут> (кнопка «Изменить»), ?p=RU&to=TH (ссылки из соцсетей).
 */
export function CheckForm({ titleId }: { titleId?: string }) {
  const t = useTranslations("check");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallbackTitleId = useId();
  const headingId = titleId ?? fallbackTitleId;

  const initial = useMemo(() => {
    const fromLink = decodeTrip(searchParams.get("d"));
    if (fromLink && ALL_PASSPORTS.includes(fromLink.passport)) {
      return { passport: fromLink.passport, stops: tripToDrafts(fromLink) };
    }
    const p = searchParams.get("p")?.toUpperCase() ?? "";
    const to = searchParams.get("to")?.toUpperCase() ?? "";
    const stop = emptyStop();
    if (getCountry(to)?.zone) stop.country = to;
    return { passport: ALL_PASSPORTS.includes(p) ? p : "", stops: [stop] };
  }, [searchParams]);

  const [step, setStep] = useState<Step>(initial.passport ? "route" : "passport");
  const [passport, setPassport] = useState(initial.passport);
  const [stops, setStops] = useState<StopDraft[]>(initial.stops);
  const [errors, setErrors] = useState<Record<string, StopErrors>>({});
  const [submitting, setSubmitting] = useState(false);

  // Один раз на открытие формы (в dev StrictMode запускает эффекты дважды).
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track("check_open", { prefilled: Boolean(initial.passport) });
  }, [initial.passport]);

  function choosePassport(code: string) {
    setPassport(code);
    setStep("route");
  }

  function updateStop(id: string, patch: Partial<StopDraft>) {
    setStops((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    if (errors[id]) {
      setErrors((e) => {
        const next = { ...e[id] };
        if ("country" in patch) delete next.country;
        if ("date" in patch) delete next.date;
        return { ...e, [id]: next };
      });
    }
  }

  function addStop() {
    setStops((list) => [...list, emptyStop(list.at(-1)?.date ?? "")]);
  }

  function removeStop(id: string) {
    setStops((list) => (list.length > 1 ? list.filter((s) => s.id !== id) : list));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateStops(stops, localToday());
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`stop-${Object.keys(found)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    router.push({ pathname: "/trip", query: { d: encodeTrip(draftsToTrip(passport, stops)) } });
  }

  const missingLink = (chunks: React.ReactNode) => (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">
      {chunks}
    </a>
  );

  return (
    <div className="flex flex-col">
      <p className="text-sm text-muted">{t("step", { current: step === "passport" ? 1 : 2, total: 2 })}</p>

      {step === "passport" ? (
        <>
          <h2 id={headingId} className="mt-1 text-2xl font-semibold tracking-tight">
            {t("passport.title")}
          </h2>
          <PassportPicker locale={locale} selected={passport} onSelect={choosePassport} />
          <p className="mt-6 text-sm text-muted">{t.rich("passport.missing", { link: missingLink })}</p>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col">
          <h2 id={headingId} className="mt-1 text-2xl font-semibold tracking-tight">
            {t("route.title")}
          </h2>
          <p className="mt-1 text-muted">{t("route.subtitle")}</p>

          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-background px-3.5 py-2.5 text-sm">
            <span>
              <span aria-hidden="true">{flagEmoji(passport)}</span>{" "}
              {t("route.passport", { country: getCountry(passport)?.name[locale] ?? passport })}
            </span>
            <button type="button" onClick={() => setStep("passport")} className="text-accent hover:underline">
              {t("route.changePassport")}
            </button>
          </p>

          <ol className="mt-4 flex flex-col gap-4">
            {stops.map((stop, i) => (
              <StopFields
                key={stop.id}
                stop={stop}
                index={i}
                canRemove={stops.length > 1}
                errors={errors[stop.id]}
                locale={locale}
                onChange={(patch) => updateStop(stop.id, patch)}
                onRemove={() => removeStop(stop.id)}
              />
            ))}
          </ol>

          {stops.length < MAX_STOPS && (
            <button
              type="button"
              onClick={addStop}
              data-sound="tap"
              className="press mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-base font-medium text-muted hover:border-accent hover:text-accent"
            >
              <span aria-hidden="true" className="text-xl leading-none">+</span> {t("route.add")}
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-sound="press"
            className="press mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-on-accent shadow-sm hover:bg-accent-hover disabled:opacity-60"
          >
            {t("route.submit")}
          </button>
          <p className="mt-4 text-sm text-muted">{t.rich("route.missingCountry", { link: missingLink })}</p>
        </form>
      )}
    </div>
  );
}

function PassportPicker({ locale, selected, onSelect }: { locale: Locale; selected: string; onSelect: (code: string) => void }) {
  const t = useTranslations("check.passport");
  const searchId = useId();
  const [query, setQuery] = useState("");

  const popular = PASSPORTS[locale] as readonly string[];
  const rest = ALL_PASSPORTS.filter((code) => !popular.includes(code));
  const q = query.trim().toLowerCase();
  const matches = (code: string) => !q || countrySearchText(getCountry(code)).includes(q);
  const groups = [
    { label: t("popular"), codes: popular.filter(matches) },
    { label: t("all"), codes: rest.filter(matches) },
  ].filter((g) => g.codes.length);

  return (
    <div className="mt-4">
      <label htmlFor={searchId} className="sr-only">
        {t("search")}
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search")}
        autoComplete="off"
        className={INPUT}
      />
      {groups.length === 0 && <p className="mt-4 text-muted">{t("empty")}</p>}
      {groups.map((group) => (
        <div key={group.label} className="mt-5">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{group.label}</p>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {group.codes.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => onSelect(code)}
                  aria-pressed={selected === code}
                  data-sound="tap"
                  className="press flex min-h-12 w-full items-center gap-2 rounded-lg border border-border px-3 text-left hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft"
                >
                  <span aria-hidden="true" className="text-lg">{flagEmoji(code)}</span>
                  <span className="truncate">{getCountry(code)?.name[locale]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StopFields({
  stop,
  index,
  canRemove,
  errors,
  locale,
  onChange,
  onRemove,
}: {
  stop: StopDraft;
  index: number;
  canRemove: boolean;
  errors?: StopErrors;
  locale: Locale;
  onChange: (patch: Partial<StopDraft>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("check");
  const ids = { country: useId(), date: useId(), time: useId(), mode: useId() };
  const today = localToday();
  const options = useDestinationOptions(locale);

  return (
    <li id={`stop-${stop.id}`} className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{t("route.stop", { n: index + 1 })}</p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("route.remove", { n: index + 1 })}
            className="press flex size-10 items-center justify-center rounded-lg text-xl text-muted hover:bg-background hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      <label htmlFor={ids.country} className="mt-3 block text-sm font-medium">
        {t("route.country")}
      </label>
      <select
        id={ids.country}
        value={stop.country}
        onChange={(e) => onChange({ country: e.target.value })}
        aria-invalid={Boolean(errors?.country)}
        className={`${INPUT} mt-1.5 appearance-none bg-[length:1rem] bg-[right_0.875rem_center] bg-no-repeat pr-10`}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      >
        <option value="" disabled>
          {t("route.chooseCountry")}
        </option>
        <optgroup label={t("route.popular")}>
          {options.popular.map((c) => (
            <option key={c.code} value={c.code}>
              {flagEmoji(c.code)} {c.name[locale]}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("route.all")}>
          {options.all.map((c) => (
            <option key={c.code} value={c.code}>
              {flagEmoji(c.code)} {c.name[locale]}
            </option>
          ))}
        </optgroup>
      </select>
      {errors?.country && <p className="mt-1 text-sm text-stop">{t(`errors.${errors.country}`)}</p>}

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
        <div className="min-w-0">
          <label htmlFor={ids.date} className="block text-sm font-medium">
            {t("route.date")}
          </label>
          <input
            id={ids.date}
            type="date"
            value={stop.date}
            min={today}
            max={maxDate(today)}
            onChange={(e) => onChange({ date: e.target.value })}
            aria-invalid={Boolean(errors?.date)}
            className={`${INPUT} mt-1.5`}
          />
        </div>
        <div className="w-28 sm:w-32">
          <label htmlFor={ids.time} className="block text-sm font-medium">
            {t("route.time")}
          </label>
          <input
            id={ids.time}
            type="time"
            value={stop.time}
            onChange={(e) => onChange({ time: e.target.value })}
            aria-describedby={`${ids.time}-hint`}
            className={`${INPUT} mt-1.5`}
          />
        </div>
      </div>
      {errors?.date && <p className="mt-1 text-sm text-stop">{t(`errors.${errors.date}`)}</p>}
      <p id={`${ids.time}-hint`} className="mt-1.5 text-xs text-muted">
        {t("route.time")} — {t("route.optional")}. {t("route.timeHint")}
      </p>

      <fieldset className="mt-3">
        <legend className="sr-only">{t("route.mode")}</legend>
        <div className="grid grid-cols-2 rounded-lg border border-border bg-background p-0.5 text-sm">
          {([false, true] as const).map((transit) => (
            <button
              key={String(transit)}
              type="button"
              aria-pressed={stop.transit === transit}
              onClick={() => onChange({ transit })}
              data-sound="toggle"
              className="press min-h-10 rounded-md px-2 font-medium text-muted aria-pressed:bg-surface aria-pressed:text-foreground aria-pressed:shadow-sm"
            >
              {transit ? t("route.transit") : t("route.entering")}
            </button>
          ))}
        </div>
        {stop.transit && <p className="mt-1.5 text-xs text-muted">{t("route.transitHint")}</p>}
      </fieldset>
    </li>
  );
}

/** Страны для выбора: популярные по треку, затем все по алфавиту на языке интерфейса. */
function useDestinationOptions(locale: Locale) {
  return useMemo(() => {
    const collator = new Intl.Collator(locale);
    const popularCodes = POPULAR_DESTINATIONS[locale] as readonly string[];
    const popular = popularCodes.map((code) => getCountry(code)).filter((c): c is Country => Boolean(c));
    const all = [...DESTINATION_COUNTRIES].sort((a, b) => collator.compare(a.name[locale], b.name[locale]));
    return { popular, all };
  }, [locale]);
}

function countrySearchText(country?: Country): string {
  if (!country) return "";
  return [country.code, country.name.ru, country.name.en, ...(country.aliases ?? [])].join(" ").toLowerCase();
}
