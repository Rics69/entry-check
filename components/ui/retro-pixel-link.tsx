import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Ретро-кнопка с пиксельной стрелкой (по мотивам RareUI Retro Pixel Button).
 *
 * В оригинале framer-motion анимирует width и padding — это пересчёт раскладки на каждом кадре.
 * Здесь то же движение на композиторе:
 * - цветной блок раскрывается через clip-path (а не width);
 * - стрелка едет через transform (cqw — ширина кнопки) и разворачивается;
 * - подпись сдвигается через transform и на мгновение размывается (blur скрывает смену цвета).
 * Наведение — только для мыши; на телефоне — нажатие с «проседанием».
 */
export function RetroPixelLink({ href, children, className = "" }: { href: "/check"; children: ReactNode; className?: string }) {
  return (
    <Link href={href} data-sound="press" className={`pixel-btn ${className}`}>
      <span className="pixel-btn-fill" aria-hidden="true" />
      <span className="pixel-btn-icon" aria-hidden="true">
        <svg viewBox="0 0 16 34" width="34" height="34" fill="currentColor">
          <rect x="7" y="6" width="5" height="5" />
          <rect x="11" y="10" width="5" height="5" />
          <rect x="15" y="14" width="5" height="5" />
          <rect x="11" y="18" width="5" height="5" />
          <rect x="7" y="22" width="5" height="5" />
        </svg>
      </span>
      <span className="pixel-btn-label">{children}</span>
    </Link>
  );
}
