/**
 * Спиннер загрузки (по мотивам RareUI Loading Spinner): кольцо, бегущая дуга с мягким свечением
 * и переливающаяся подпись. Без framer-motion — CSS (.ec-spin, .ec-shimmer в globals.css).
 * Цвет — currentColor: на кнопке берёт цвет текста кнопки, на странице — акцент.
 * Быстрое вращение (0,8 с на оборот) — ожидание ощущается короче.
 */

const RING = "M 9 16.25 C 4.996 16.25 1.75 13.004 1.75 9 C 1.75 4.996 4.996 1.75 9 1.75 C 13.004 1.75 16.25 4.996 16.25 9 C 16.25 13.004 13.004 16.25 9 16.25 Z";
const ARC = "M 16.25 9 C 16.25 10.07 16.018 11.086 15.602 12 C 15.163 12.965 14.518 13.817 13.724 14.5";

const SIZES = { sm: "size-3.5", md: "size-5", lg: "size-8" } as const;

export function LoadingSpinner({
  label,
  size = "md",
  shimmer = true,
  decorative = false,
  className = "",
}: {
  /** Подпись рядом со спиннером. */
  label?: string;
  size?: keyof typeof SIZES;
  /** Перелив подписи; на цветной кнопке выключаем — подпись берёт цвет кнопки. */
  shimmer?: boolean;
  /** Только украшение (рядом уже есть текст для экранных дикторов). */
  decorative?: boolean;
  className?: string;
}) {
  const path = (d: string, extra = "") => (
    <svg viewBox="0 0 18 18" className={`absolute inset-0 size-full ${extra}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <span
      role={decorative ? undefined : "status"}
      aria-hidden={decorative || undefined}
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <span className={`relative shrink-0 ${SIZES[size]}`} aria-hidden="true">
        {path(RING, "opacity-20")}
        <span className="ec-spin absolute inset-0">
          {path(ARC)}
          {path(ARC, "opacity-60 blur-[2px]")}
        </span>
      </span>
      {label && <span className={shimmer ? "ec-shimmer font-medium" : "font-medium"}>{label}</span>}
    </span>
  );
}
