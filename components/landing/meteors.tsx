import type { CSSProperties } from "react";

/**
 * Метеоры на фоне первого экрана (Magic UI Meteors, MIT).
 * В оригинале позиции случайные и считаются в браузере после загрузки. Здесь — детерминированные
 * по индексу: тот же вид без JavaScript и без расхождения сервер/клиент.
 * Анимация — CSS (.ec-meteor в globals.css): только transform и opacity; при reduced motion скрыты.
 */
export function Meteors({ count = 18, angle = 215 }: { count?: number; angle?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        // Псевдослучайные, но стабильные значения 0..1 для каждого метеора.
        const r1 = fract(Math.sin(i * 12.9898) * 43758.5453);
        const r2 = fract(Math.sin(i * 78.233) * 12345.6789);
        const r3 = fract(Math.sin(i * 39.3467) * 24634.6345);
        const style = {
          "--angle": `${-angle}deg`,
          top: "-5%",
          left: `${Math.round(r1 * 110 - 5)}%`,
          animationDelay: `${(r2 * 6).toFixed(2)}s`,
          animationDuration: `${Math.round(4 + r3 * 7)}s`,
        } as CSSProperties;
        return (
          <span
            key={i}
            style={style}
            className="ec-meteor absolute size-0.5 rotate-(--angle) rounded-full bg-subtle shadow-[0_0_0_1px_#ffffff10]"
          >
            <span className="absolute top-1/2 h-px w-14 -translate-y-1/2 bg-linear-to-r from-subtle to-transparent" />
          </span>
        );
      })}
    </div>
  );
}

function fract(x: number): number {
  return x - Math.floor(x);
}
