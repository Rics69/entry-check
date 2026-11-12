"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Попап поверх текущей страницы для перехваченного маршрута (@modal/(.)check).
 * Закрытие = шаг назад в истории: работают кнопка «Назад» на телефоне, Escape, крестик и клик мимо окна.
 * На телефоне — лист снизу, на компьютере — окно по центру.
 */
export function Modal({ children, labelledBy, closeLabel }: { children: ReactNode; labelledBy: string; closeLabel: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    // Страница под попапом недоступна ни мышью, ни клавиатурой, ни скринридером.
    // Блокируем только соседей контейнера с попапом, чтобы не заблокировать сам попап.
    const background = [...document.body.children].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        !el.contains(rootRef.current) &&
        // Объявления о переходах для скринридеров должны продолжать работать.
        !["SCRIPT", "NEXT-ROUTE-ANNOUNCER"].includes(el.tagName) &&
        !el.hasAttribute("inert"),
    );
    background.forEach((el) => el.setAttribute("inert", ""));

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      // Фокус не уходит из окна на страницу под ним.
      if (event.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items.at(-1)!;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.style.overflow = prevOverflow;
      background.forEach((el) => el.removeAttribute("inert"));
      previouslyFocused?.focus?.();
    };
  }, [close]);

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="ec-backdrop absolute inset-0 bg-black/45" onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="ec-sheet relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-surface px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] focus:outline-none sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <button
          type="button"
          onClick={close}
          aria-label={closeLabel}
          className="press absolute top-3 right-3 flex size-11 items-center justify-center rounded-lg text-2xl text-muted hover:bg-background hover:text-foreground"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
