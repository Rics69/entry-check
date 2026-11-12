"use client";

/*
 * Сетка медленно меняющихся символов — фон подвала (Magic UI Glyph Matrix, MIT).
 *
 * Отличия от исходника:
 * - цвет берётся из CSS-переменной темы и обновляется при смене светлой/тёмной темы (без next-themes);
 * - затухание к верху или к низу (в подвале — к верху, чтобы граница с контентом была чистой);
 * - пауза вне экрана и на скрытой вкладке;
 * - prefers-reduced-motion: один неподвижный кадр.
 */

import { useEffect, useRef } from "react";

export function GlyphMatrix({
  glyphs = "01·•+*/\\<>=",
  cellSize = 14,
  mutationRate = 0.04,
  interval = 90,
  fade = 0.85,
  fadeTo = "top",
  colorVar = "--subtle",
  className = "",
}: {
  glyphs?: string;
  cellSize?: number;
  /** Доля клеток, меняющихся за тик. */
  mutationRate?: number;
  /** Мс между тиками. */
  interval?: number;
  /** Сила затухания 0..1. */
  fade?: number;
  fadeTo?: "top" | "bottom";
  /** CSS-переменная с цветом символов. */
  colorVar?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    let rgb = "107, 114, 128";
    let cols = 0;
    let rows = 0;
    let cells: string[] = [];
    let alphas: number[] = [];
    let raf = 0;
    let last = 0;
    let visible = true;

    const pick = () => glyphs[Math.floor(Math.random() * glyphs.length)];

    const resolveColor = () => {
      const probe = document.createElement("canvas").getContext("2d");
      if (!probe) return;
      probe.fillStyle = getComputedStyle(canvas).getPropertyValue(colorVar).trim() || "#6b7280";
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      rgb = `${r}, ${g}, ${b}`;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / cellSize);
      rows = Math.ceil(h / cellSize);
      cells = Array.from({ length: cols * rows }, pick);
      alphas = Array.from({ length: cols * rows }, () => 0.05 + Math.random() * 0.35);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.font = `${cellSize - 2}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = "top";
      for (let y = 0; y < rows; y++) {
        const pos = fadeTo === "bottom" ? y / rows : 1 - y / rows;
        const k = 1 - pos * fade;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          ctx.fillStyle = `rgba(${rgb}, ${(alphas[i] * k).toFixed(3)})`;
          ctx.fillText(cells[i], x * cellSize, y * cellSize);
        }
      }
    };

    const tick = (t: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      if (t - last >= interval) {
        last = t;
        const total = cols * rows;
        for (let n = Math.max(1, Math.floor(total * mutationRate)); n > 0; n--) {
          const i = Math.floor(Math.random() * total);
          cells[i] = pick();
          alphas[i] = 0.05 + Math.random() * 0.45;
        }
        draw();
      }
      raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (reduceMotion || raf) return;
      raf = requestAnimationFrame(tick);
    };

    resolveColor();
    resize();
    draw();
    play();

    const onScheme = () => {
      resolveColor();
      draw();
    };
    scheme.addEventListener("change", onScheme);

    const ro = new ResizeObserver(() => {
      resize();
      draw();
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
      scheme.removeEventListener("change", onScheme);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [glyphs, cellSize, mutationRate, interval, fade, fadeTo, colorVar]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none block size-full ${className}`} />;
}
