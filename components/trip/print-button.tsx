"use client";

/** «Сохранить PDF» = печать браузера: без серверной генерации и без процессорного времени воркера. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-sound="press"
      className="press inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hover print:hidden"
    >
      {label}
    </button>
  );
}
