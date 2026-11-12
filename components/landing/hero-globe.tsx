"use client";

/*
 * Глобус на фоне первого экрана (Magic UI Globe, MIT; рендер — cobe 2, MIT).
 * Точки — 16 стран, которые мы покрываем; дуги — маршрут из примера справа.
 *
 * Отличия от исходника Magic UI:
 * - cobe 2 рисует только по update(), поэтому кадры ведём сами: пауза вне экрана и на скрытой вкладке;
 * - фоновый, без перетаскивания (pointer-events: none), поэтому без motion;
 * - prefers-reduced-motion: один неподвижный кадр, развёрнутый к маршруту;
 * - цвета под светлую и тёмную тему, переключаются на лету.
 */

import createGlobe, { type Arc, type COBEOptions, type Marker } from "cobe";
import { useEffect, useRef } from "react";

type Rgb = [number, number, number];

const THEMES: Record<"light" | "dark", Pick<COBEOptions, "dark" | "baseColor" | "glowColor" | "markerColor" | "mapBrightness" | "diffuse"> & { arcColor: Rgb }> = {
  light: {
    dark: 0,
    diffuse: 0.4,
    mapBrightness: 1.2,
    baseColor: [1, 1, 1],
    glowColor: [1, 1, 1],
    markerColor: [29 / 255, 78 / 255, 216 / 255],
    arcColor: [29 / 255, 78 / 255, 216 / 255],
  },
  dark: {
    dark: 1,
    diffuse: 1.2,
    mapBrightness: 5,
    baseColor: [0.32, 0.32, 0.36],
    glowColor: [0.16, 0.16, 0.2],
    markerColor: [96 / 255, 165 / 255, 250 / 255],
    arcColor: [147 / 255, 197 / 255, 253 / 255],
  },
};

/** Широта/долгота → углы cobe, чтобы точка смотрела на зрителя. */
function facing([lat, lng]: [number, number]): { phi: number; theta: number } {
  return { phi: Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), theta: (lat * Math.PI) / 180 };
}

const SPIN_PER_MS = 0.00004; // ≈ один оборот за 2,6 минуты

export function HeroGlobe({
  markers,
  arcs,
  focus,
  className = "",
}: {
  markers: Marker[];
  arcs: Arc[];
  /** Куда развернуть глобус в начале: середина маршрута. */
  focus: [number, number];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = JSON.stringify({ markers, arcs, focus });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { markers, arcs, focus } = JSON.parse(config) as { markers: Marker[]; arcs: Arc[]; focus: [number, number] };

    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = facing(focus);
    const theme = () => THEMES[dark.matches ? "dark" : "light"];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let size = canvas.offsetWidth * dpr;
    let phi = start.phi;

    let globe;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: size,
        height: size,
        phi,
        theta: Math.max(0.15, Math.min(start.theta * 0.6, 0.45)),
        mapSamples: 16000,
        markers,
        arcs,
        arcWidth: 0.6,
        arcHeight: 0.25,
        markerElevation: 0.01,
        ...theme(),
      });
    } catch {
      return; // нет WebGL — фон просто остаётся без глобуса
    }
    const g = globe;

    let raf = 0;
    let last = 0;
    let visible = true;

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      phi += (now - last) * SPIN_PER_MS * (last ? 1 : 0);
      last = now;
      g.update({ phi, width: size, height: size });
      raf = requestAnimationFrame(frame);
    };
    const play = () => {
      if (reduceMotion || raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    g.update({ phi, width: size, height: size });
    canvas.style.opacity = "1";
    play();

    const onTheme = () => g.update(theme());
    dark.addEventListener("change", onTheme);

    const ro = new ResizeObserver(() => {
      size = canvas.offsetWidth * dpr;
      g.update({ width: size, height: size });
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
    });
    io.observe(canvas);

    const onVisibility = () => {
      if (!document.hidden) play();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      dark.removeEventListener("change", onTheme);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      g.destroy();
    };
  }, [config]);

  return (
    <div className={`pointer-events-none aspect-square ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="size-full opacity-0 transition-opacity duration-700 [contain:layout_paint_size]" />
    </div>
  );
}
