import { useTranslations } from "next-intl";
import type { Status } from "@/lib/rules/types";

/** Цвета статусов: зелёный — ничего не нужно, жёлтый — форма или сбор, красный — разрешение заранее. */
export const STATUS_STYLES: Record<Status, { pill: string; bar: string; dot: string }> = {
  green: { pill: "bg-ok-soft text-ok", bar: "bg-ok", dot: "bg-ok" },
  yellow: { pill: "bg-warn-soft text-warn", bar: "bg-warn", dot: "bg-warn" },
  red: { pill: "bg-stop-soft text-stop", bar: "bg-stop", dot: "bg-stop" },
  unknown: { pill: "bg-background text-muted", bar: "bg-subtle", dot: "bg-subtle" },
};

export function StatusBadge({ status, className = "" }: { status: Status; className?: string }) {
  const t = useTranslations("trip.status");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium whitespace-nowrap ${STATUS_STYLES[status].pill} ${className}`}
    >
      <span className={`size-2 rounded-full ${STATUS_STYLES[status].dot}`} aria-hidden="true" />
      {t(status)}
    </span>
  );
}
