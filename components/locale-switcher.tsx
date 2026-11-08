"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, { short: string; name: string }> = {
  ru: { short: "RU", name: "Русский" },
  en: { short: "EN", name: "English" },
};

function SwitcherLinks({ query }: { query?: Record<string, string> }) {
  const current = useLocale();
  const pathname = usePathname();
  const t = useTranslations("header");

  return (
    <nav
      aria-label={t("language")}
      className="flex rounded-lg border border-border bg-background p-0.5"
    >
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={{ pathname, query }}
            locale={locale}
            lang={locale}
            title={LABELS[locale].name}
            aria-current={active ? "true" : undefined}
            className={
              "flex h-10 min-w-11 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors " +
              (active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground")
            }
          >
            {LABELS[locale].short}
          </Link>
        );
      })}
    </nav>
  );
}

// Параметры адреса (например, маршрут в /trip?d=…) сохраняем при смене языка.
function SwitcherWithQuery() {
  const searchParams = useSearchParams();
  return <SwitcherLinks query={Object.fromEntries(searchParams)} />;
}

export function LocaleSwitcher() {
  return (
    <Suspense fallback={<SwitcherLinks />}>
      <SwitcherWithQuery />
    </Suspense>
  );
}
