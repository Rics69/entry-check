import type { CSSProperties } from "react";

/**
 * Заголовок первого экрана с «магнитным» разлётом букв (по мотивам RareUI Magnetic Scatter Text).
 *
 * В оригинале — framer-motion и пружины, а текст до загрузки JS невидим. Здесь — только CSS:
 * - появление: буквы слетаются из детерминированных точек (keyframes, есть сразу с HTML, без JS);
 * - разлёт при наведении: transition с лёгким перелётом, прерывается и разворачивается на ходу;
 * - наведение — только для мыши (@media hover), на телефоне только появление;
 * - prefers-reduced-motion: текст стоит на месте.
 * Слова не рвутся: каждое слово — неразрывный блок, переносы только между словами.
 * Экранным дикторам — aria-label с целой фразой (буквы скрыты от них), поисковикам — сами буквы:
 * внутри слова между ними нет пробелов, поэтому текст читается целиком и без дубля.
 */
export function MagneticTitle({ text, className = "" }: { text: string; className?: string }) {
  let index = 0;
  const words = text.split(" ");

  return (
    <h1 className={`magnetic ${className}`} aria-label={text}>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <span key={w}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((letter) => {
                const i = index++;
                const seed = (i + 1) * 42;
                const style = {
                  "--i": i,
                  // Разлёт при наведении умеренный: заголовок должен читаться, даже если мышь задержалась на нём.
                  "--sx": `${(Math.sin(seed) * 0.3).toFixed(3)}em`,
                  "--sy": `${(Math.cos(seed) * 0.22).toFixed(3)}em`,
                  "--sr": `${(Math.sin(seed * 2) * 14).toFixed(1)}deg`,
                  "--fx": `${(Math.sin(seed) * 220).toFixed(1)}px`,
                  "--fy": `${(Math.cos(seed) * 160).toFixed(1)}px`,
                  "--fr": `${(Math.sin(seed * 2) * 120).toFixed(1)}deg`,
                } as CSSProperties;
                return (
                  <span key={i} className="magnetic-in inline-block" style={style}>
                    <span className="magnetic-letter inline-block">{letter}</span>
                  </span>
                );
              })}
            </span>
            {w < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </h1>
  );
}
