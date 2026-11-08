import { getCountry } from "@/data/countries";
import { DESTINATIONS } from "@/data/destinations";
import { isValidDate } from "@/lib/trip-codec";
import type { Requirement, RequirementKind, Text } from "./types";

const KINDS: RequirementKind[] = [
  "visa_free", "eta", "evisa", "visa_on_arrival", "visa", "arrival_card", "levy", "info",
];

function checkText(errors: string[], field: string, value: Text | undefined, required = false) {
  if (value === undefined) {
    if (required) errors.push(`${field}: обязательное поле`);
    return;
  }
  if (!value.ru?.trim()) errors.push(`${field}.ru: пусто`);
  if (!value.en?.trim()) errors.push(`${field}.en: пусто`);
}

/** Ошибки структуры одного правила. Пустой массив — правило корректно. */
export function validateRequirement(rule: Requirement): string[] {
  const errors: string[] = [];

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(rule.id)) errors.push(`id "${rule.id}": только a-z, 0-9 и дефис`);
  if (!(rule.destination in DESTINATIONS)) errors.push(`destination "${rule.destination}": нет в data/destinations.ts`);
  if (!KINDS.includes(rule.kind)) errors.push(`kind "${rule.kind}": неизвестный тип`);

  const { passports, except } = rule.appliesTo ?? {};
  if (passports !== "ALL") {
    if (!Array.isArray(passports) || passports.length === 0) errors.push("appliesTo.passports: список или \"ALL\"");
    else for (const code of passports) if (!getCountry(code)) errors.push(`appliesTo.passports: неизвестная страна "${code}"`);
  }
  for (const code of except ?? []) if (!getCountry(code)) errors.push(`appliesTo.except: неизвестная страна "${code}"`);

  checkText(errors, "name", rule.name, true);
  checkText(errors, "processing", rule.processing);
  checkText(errors, "passportValidity", rule.passportValidity);
  checkText(errors, "notes", rule.notes);

  if (!rule.officialUrl?.startsWith("https://")) errors.push("officialUrl: нужна ссылка https://");
  if (!rule.source?.startsWith("https://")) errors.push("source: нужна ссылка https://");

  if (rule.fee) {
    if (!(rule.fee.amount >= 0)) errors.push("fee.amount: число ≥ 0");
    if (!/^[A-Z]{3}$/.test(rule.fee.currency)) errors.push(`fee.currency "${rule.fee.currency}": код ISO 4217`);
  }
  for (const field of ["windowHoursBeforeArrival", "windowDaysBeforeArrival", "recommendDaysBeforeArrival", "stayLimitDays"] as const) {
    const value = rule[field];
    if (value !== undefined && !(Number.isInteger(value) && value > 0)) errors.push(`${field}: целое > 0`);
  }
  if ((rule.windowHoursBeforeArrival || rule.windowDaysBeforeArrival) && rule.kind !== "arrival_card") {
    errors.push("окно подачи (windowHours/DaysBeforeArrival): только для arrival_card");
  }
  if (rule.windowHoursBeforeArrival && rule.windowDaysBeforeArrival) {
    errors.push("окно подачи: либо windowHoursBeforeArrival, либо windowDaysBeforeArrival");
  }

  for (const field of ["validFrom", "validUntil"] as const) {
    const value = rule[field];
    if (value !== undefined && !isValidDate(value)) errors.push(`${field}: дата YYYY-MM-DD`);
  }
  if (rule.validFrom && rule.validUntil && rule.validFrom > rule.validUntil) {
    errors.push("validFrom позже validUntil");
  }
  if (rule.verifiedAt !== null && !isValidDate(rule.verifiedAt)) errors.push("verifiedAt: дата YYYY-MM-DD или null");

  return errors;
}
