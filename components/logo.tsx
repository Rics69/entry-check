/** Знак Entry Check: страница паспорта с галочкой. Цвет берётся из currentColor. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="5" y="3" width="22" height="26" rx="5" fill="currentColor" />
      <path
        d="M11 16.5l3.5 3.5L21.5 12"
        fill="none"
        stroke="var(--surface)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
