import { getCountry } from "@/data/countries";
import { DESTINATIONS } from "@/data/destinations";
import { RULES } from "@/data/requirements";
import {
  ENTRY_KINDS,
  type EntryKind,
  type Requirement,
  type Status,
  type Text,
  type Trip,
  type ZoneCode,
} from "./types";
import { addDays, calendarWindow, filingWindow, type FilingWindow } from "./windows";

/**
 * Движок проверки: (паспорт, маршрут) → карточки по точкам и сводка.
 * Чистая функция без запросов к серверу: работает в браузере, в письмах и в тестах.
 */

export type RequirementItem = {
  requirement: Requirement;
  status: Status;
  /** Окно подачи — для карт прибытия «за N часов до прилёта». */
  window?: FilingWindow;
  /** Подать не позже этой даты "YYYY-MM-DD" — для ETA, e-Visa, виз. */
  applyBy?: string;
  /** Правило ещё не проверено человеком. */
  draft: boolean;
};

export type StopResult = {
  /** Индексы точек маршрута, собранных в эту карточку (подряд идущие страны Шенгена — одна карточка). */
  stopIndexes: number[];
  countries: string[];
  zone: ZoneCode | null;
  arrivalDate: string;
  arrivalTime?: string;
  /** Только пересадка во всех точках карточки. */
  transit: boolean;
  /** Страна гражданства — ничего не нужно. */
  home: boolean;
  status: Status;
  /** Режим въезда. null — дома, транзит без выхода из аэропорта или нет данных. */
  entry: RequirementItem | null;
  extras: RequirementItem[];
  transitNote: Text | null;
  /** Официальный портал зоны — куда вести, если данных по паре нет. */
  portalUrl: string | null;
  passportValidity?: Text;
  onwardTicketMayBeAsked: boolean;
  /** Самая старая дата проверки среди правил карточки; null — есть черновики или нет данных. */
  verifiedAt: string | null;
  draft: boolean;
};

export type TripSummary = {
  stops: number;
  /** ETA, e-Visa, визы — нужно получить заранее. */
  permits: number;
  /** Карты прибытия. */
  forms: number;
  /** Платные визы по прилёте. */
  payOnArrival: number;
  levies: number;
  /** Карточки без данных о режиме въезда. */
  unknown: number;
};

export type TripResult = {
  passport: string;
  stops: StopResult[];
  summary: TripSummary;
  /** Худший статус по маршруту. */
  overall: Status;
};

export type EvaluateOptions = {
  now: Date;
  /** Набор правил; по умолчанию — RULES (без черновиков в продакшне). */
  rules?: Requirement[];
};

const SEVERITY: Record<Status, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };

export function worstStatus(statuses: Status[]): Status {
  return statuses.reduce<Status>((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), "green");
}

/** Цвет одного требования. */
export function requirementStatus(rule: Requirement): Status {
  switch (rule.kind) {
    case "visa_free":
    case "info":
      return "green";
    case "visa_on_arrival":
      // Бесплатный штамп по прилёте (ОАЭ) — по сути безвиз; платная виза — жёлтая.
      return rule.fee?.amount === 0 ? "green" : "yellow";
    case "arrival_card":
    case "levy":
      return "yellow";
    case "eta":
    case "evisa":
    case "visa":
      return "red";
  }
}

export function isEntryKind(kind: Requirement["kind"]): kind is EntryKind {
  return (ENTRY_KINDS as readonly string[]).includes(kind);
}

/** Применимо ли правило к паспорту при прилёте в дату "YYYY-MM-DD". */
export function ruleApplies(rule: Requirement, passport: string, date: string): boolean {
  const { passports, except } = rule.appliesTo;
  if (except?.includes(passport)) return false;
  if (passports !== "ALL" && !passports.includes(passport)) return false;
  if (rule.validFrom && date < rule.validFrom) return false;
  if (rule.validUntil && date > rule.validUntil) return false;
  return true;
}

export function zoneOf(country: string): ZoneCode | null {
  return getCountry(country)?.zone ?? null;
}

type Group = {
  stopIndexes: number[];
  countries: string[];
  zone: ZoneCode | null;
  arrivalDate: string;
  arrivalTime?: string;
  transit: boolean;
};

/** Подряд идущие точки в Шенгене — одна карточка: контроль проходят один раз, на входе в зону. */
function groupStops(trip: Trip): Group[] {
  const groups: Group[] = [];
  trip.stops.forEach((stop, index) => {
    const zone = zoneOf(stop.country);
    const prev = groups.at(-1);
    if (zone === "SCHENGEN" && prev?.zone === "SCHENGEN") {
      prev.stopIndexes.push(index);
      if (!prev.countries.includes(stop.country)) prev.countries.push(stop.country);
      prev.transit = prev.transit && Boolean(stop.transit);
      return;
    }
    groups.push({
      stopIndexes: [index],
      countries: [stop.country],
      zone,
      arrivalDate: stop.date,
      arrivalTime: stop.time,
      transit: Boolean(stop.transit),
    });
  });
  return groups;
}

function toItem(rule: Requirement, group: Group, timeZone: string, now: Date): RequirementItem {
  const item: RequirementItem = {
    requirement: rule,
    status: requirementStatus(rule),
    draft: rule.verifiedAt === null,
  };
  if (rule.windowDaysBeforeArrival) {
    item.window = calendarWindow({
      arrivalDate: group.arrivalDate,
      arrivalTime: group.arrivalTime,
      timeZone,
      days: rule.windowDaysBeforeArrival,
      now,
    });
  } else if (rule.windowHoursBeforeArrival) {
    item.window = filingWindow({
      arrivalDate: group.arrivalDate,
      arrivalTime: group.arrivalTime,
      timeZone,
      hoursBefore: rule.windowHoursBeforeArrival,
      now,
    });
  }
  if (rule.recommendDaysBeforeArrival) {
    item.applyBy = addDays(group.arrivalDate, -rule.recommendDaysBeforeArrival);
  }
  return item;
}

function evaluateGroup(passport: string, group: Group, rules: Requirement[], now: Date): StopResult {
  const base = {
    stopIndexes: group.stopIndexes,
    countries: group.countries,
    zone: group.zone,
    arrivalDate: group.arrivalDate,
    arrivalTime: group.arrivalTime,
    transit: group.transit,
  };

  const isHome = group.zone !== "SCHENGEN" && group.countries.length === 1 && group.countries[0] === passport;
  if (isHome || !group.zone) {
    return {
      ...base,
      home: isHome,
      status: isHome ? "green" : "unknown",
      entry: null,
      extras: [],
      transitNote: null,
      portalUrl: null,
      onwardTicketMayBeAsked: false,
      verifiedAt: null,
      draft: false,
    };
  }

  const destination = DESTINATIONS[group.zone];
  const applicable = rules.filter(
    (rule) => rule.destination === group.zone && ruleApplies(rule, passport, group.arrivalDate),
  );
  const airside = group.transit && destination.transit.airsideOk;

  let entry: RequirementItem | null = null;
  let extras: RequirementItem[];

  if (airside) {
    // Пересадка без выхода из аэропорта: только то, что явно нужно и транзитникам.
    extras = applicable
      .filter((rule) => rule.appliesToTransit)
      .map((rule) => toItem(rule, group, destination.timeZone, now));
  } else {
    const entryRules = applicable.filter((rule) => isEntryKind(rule.kind));
    // Ожидается ровно одно правило (это проверяет тест). Если их несколько — берём самое строгое.
    const strictest = entryRules.sort(
      (a, b) => SEVERITY[requirementStatus(b)] - SEVERITY[requirementStatus(a)],
    )[0];
    entry = strictest ? toItem(strictest, group, destination.timeZone, now) : null;
    extras = applicable
      .filter((rule) => !isEntryKind(rule.kind))
      .map((rule) => toItem(rule, group, destination.timeZone, now));
  }

  const used = [...(entry ? [entry] : []), ...extras];
  const missingEntry = !airside && entry === null;
  const status = missingEntry ? "unknown" : worstStatus(used.map((item) => item.status));
  const draft = used.some((item) => item.draft);
  const dates = used.map((item) => item.requirement.verifiedAt).filter((d): d is string => d !== null);

  return {
    ...base,
    home: false,
    status,
    entry,
    extras,
    transitNote: group.transit ? destination.transit.note : null,
    portalUrl: destination.portalUrl,
    passportValidity:
      entry?.requirement.passportValidity ??
      used.find((item) => item.requirement.passportValidity)?.requirement.passportValidity,
    onwardTicketMayBeAsked: used.some((item) => item.requirement.onwardTicketMayBeAsked),
    verifiedAt: draft || missingEntry || dates.length === 0 ? null : dates.sort()[0],
    draft,
  };
}

export function evaluateTrip(trip: Trip, options: EvaluateOptions): TripResult {
  const rules = options.rules ?? RULES;
  const stops = groupStops(trip).map((group) => evaluateGroup(trip.passport, group, rules, options.now));

  const items = stops.flatMap((stop) => [...(stop.entry ? [stop.entry] : []), ...stop.extras]);
  const count = (predicate: (item: RequirementItem) => boolean) => items.filter(predicate).length;

  const summary: TripSummary = {
    stops: stops.length,
    permits: count((item) => item.status === "red"),
    forms: count((item) => item.requirement.kind === "arrival_card"),
    payOnArrival: count((item) => item.requirement.kind === "visa_on_arrival" && item.status === "yellow"),
    levies: count((item) => item.requirement.kind === "levy"),
    unknown: stops.filter((stop) => stop.status === "unknown").length,
  };

  return {
    passport: trip.passport,
    stops,
    summary,
    overall: worstStatus(stops.map((stop) => stop.status)),
  };
}
