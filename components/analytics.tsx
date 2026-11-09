"use client";

import { useEffect } from "react";
import { EVENT_NAMES, rememberRef, track, type EventName } from "@/lib/analytics";

/**
 * Один на страницу: запоминает ?ref= и ловит клики по элементам с data-track.
 * Так серверные компоненты (карточки стран) размечают ссылки атрибутами, без своего JS:
 *   <a data-track="official_click" data-zone="TH" data-rule="th-tdac">
 */
export function Analytics() {
  useEffect(() => {
    rememberRef();

    function onClick(event: MouseEvent) {
      const el = (event.target as Element | null)?.closest<HTMLElement>("[data-track]");
      const name = el?.dataset.track;
      if (!el || !name || !(EVENT_NAMES as readonly string[]).includes(name)) return;
      const props: Record<string, string> = {};
      for (const [key, value] of Object.entries(el.dataset)) {
        if (key !== "track" && value) props[key] = value;
      }
      track(name as EventName, props);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
