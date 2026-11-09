import { useTranslations } from "next-intl";
import type { TripSummary as Summary } from "@/lib/rules/engine";

/** «3 страны: 1 разрешение заранее, 2 карты прибытия». */
export function useTripSummaryText(summary: Summary): string {
  const t = useTranslations("trip.summary");
  const parts = [
    summary.permits && t("permits", { count: summary.permits }),
    summary.payOnArrival && t("payOnArrival", { count: summary.payOnArrival }),
    summary.forms && t("forms", { count: summary.forms }),
    summary.levies && t("levies", { count: summary.levies }),
    summary.unknown && t("unknown", { count: summary.unknown }),
  ].filter(Boolean);
  return `${t("stops", { count: summary.stops })}: ${parts.length ? parts.join(", ") : t("nothing")}`;
}

export function TripSummaryText({ summary, className = "" }: { summary: Summary; className?: string }) {
  return <p className={className}>{useTripSummaryText(summary)}</p>;
}
