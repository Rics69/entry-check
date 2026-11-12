"use client";

import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { isSoundEnabled, playSound, setSoundEnabled, subscribeSound, type SoundKind } from "@/lib/sound";

const KINDS = new Set<SoundKind>(["tap", "press", "toggle"]);

/**
 * Один обработчик на всю страницу: элемент с data-sound="tap|press|toggle" щёлкает при нажатии.
 * Звук — на pointerdown (как физическая кнопка), только основной кнопкой мыши или касанием.
 * С клавиатуры звука нет: действия с клавиатуры повторяются часто и не должны «шуметь».
 */
export function SoundEffects() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const el = (event.target as Element | null)?.closest<HTMLElement>("[data-sound]");
      if (!el || el.matches(":disabled, [aria-disabled='true']")) return;
      const kind = el.dataset.sound as SoundKind;
      playSound(KINDS.has(kind) ? kind : "tap");
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);
  return null;
}

/** Кнопка «звук вкл/выкл» в шапке. До гидрации считаем, что звук включён (как по умолчанию). */
export function SoundToggle() {
  const t = useTranslations("header");
  const enabled = useSyncExternalStore(subscribeSound, isSoundEnabled, () => true);

  return (
    <button
      type="button"
      onClick={() => {
        setSoundEnabled(!enabled);
        // Включили — сразу слышно, что работает. Выключили — тишина.
        if (!enabled) playSound("toggle", { force: true });
      }}
      aria-pressed={enabled}
      aria-label={enabled ? t("soundOff") : t("soundOn")}
      title={enabled ? t("soundOff") : t("soundOn")}
      className="press inline-flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {enabled ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        ) : (
          <path d="m16 9 5 6m0-6-5 6" />
        )}
      </svg>
    </button>
  );
}
