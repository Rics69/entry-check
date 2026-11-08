import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SITE_NAME } from "@/lib/site";
import { LocaleSwitcher } from "./locale-switcher";
import { LogoMark } from "./logo";

export function SiteHeader() {
  const t = useTranslations("header");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          aria-label={t("home")}
          className="flex min-h-11 items-center gap-2 rounded-md text-foreground"
        >
          <LogoMark className="size-7 text-accent" />
          <span className="text-lg font-semibold tracking-tight">{SITE_NAME}</span>
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
