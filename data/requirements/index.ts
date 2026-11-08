import type { Requirement } from "@/lib/rules/types";
import AE from "./AE.json";
import CN from "./CN.json";
import EG from "./EG.json";
import GB from "./GB.json";
import ID from "./ID.json";
import IN from "./IN.json";
import JP from "./JP.json";
import KR from "./KR.json";
import LK from "./LK.json";
import MY from "./MY.json";
import SCHENGEN from "./SCHENGEN.json";
import SG from "./SG.json";
import TH from "./TH.json";
import TR from "./TR.json";
import US from "./US.json";
import VN from "./VN.json";

/** Все правила из репозитория, включая черновики. Структура проверяется тестом tests/rules-data.test.ts. */
export const ALL_RULES = [
  ...TH, ...VN, ...ID, ...TR, ...AE, ...EG, ...LK, ...MY, ...IN, ...CN,
  ...GB, ...SCHENGEN, ...SG, ...KR, ...JP, ...US,
] as Requirement[];

/**
 * Показывать ли непроверенные правила (verifiedAt: null).
 * В разработке и тестах — да, с пометкой «черновик». В продакшн-сборке — нет,
 * если явно не включено NEXT_PUBLIC_INCLUDE_DRAFT_RULES=true (например, для закрытого превью).
 */
export const INCLUDE_DRAFTS =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_INCLUDE_DRAFT_RULES === "true";

/** Правила, которые видит движок. */
export const RULES: Requirement[] = INCLUDE_DRAFTS
  ? ALL_RULES
  : ALL_RULES.filter((rule) => rule.verifiedAt !== null);
