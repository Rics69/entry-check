import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LiquidMetalWordmark } from "./brand/liquid-metal-wordmark";
import { LocaleSwitcher } from "./locale-switcher";
import { SoundToggle } from "./sound";

const SECTIONS = ["how", "pricing", "faq"] as const;

export function SiteHeader() {
  const t = useTranslations("header");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75 print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label={t("home")} data-sound="tap" className="press flex min-h-11 items-center rounded-md">
          <LiquidMetalWordmark className="h-7 sm:h-8" />
        </Link>

        <nav aria-label={t("nav.label")} className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((id) => (
            <Link
              key={id}
              href={{ pathname: "/", hash: id }}
              data-sound="tap"
              className="press rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              {t(`nav.${id}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/check"
            data-sound="press"
            className="press hidden min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover sm:inline-flex"
          >
            {t("cta")}
          </Link>
          <SoundToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
