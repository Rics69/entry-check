import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { legalSeller, SELLER_CONFIGURED, SUPPORT_EMAIL } from "@/lib/site";
import { LiquidMetalWordmark } from "./brand/liquid-metal-wordmark";
import { GlyphMatrix } from "./ui/glyph-matrix";

const DOCS = ["terms", "privacy", "refunds"] as const;

export function SiteFooter() {
  const t = useTranslations("footer");
  const header = useTranslations("header");
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden border-t border-border bg-surface print:hidden">
      {/* Фон: медленно меняющиеся символы, гаснут к верху — у текста фон спокойный. */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-full" aria-hidden="true">
        <GlyphMatrix fadeTo="top" fade={0.9} />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-10 pb-16 text-sm text-muted">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/" aria-label={header("home")} data-sound="tap" className="press inline-flex self-start rounded-md">
            <LiquidMetalWordmark className="h-6" />
          </Link>
          <nav aria-label={t("legalNav")} className="flex flex-wrap gap-x-6 gap-y-3">
            {DOCS.map((doc) => (
              <Link key={doc} href={`/legal/${doc}`} data-sound="tap" className="press transition-colors hover:text-foreground">
                {t(doc)}
              </Link>
            ))}
            <a href={`mailto:${SUPPORT_EMAIL}`} data-sound="tap" className="press transition-colors hover:text-foreground">
              {t("contacts")}
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <p>{t("disclaimer")}</p>
          <p>{t("payments")}</p>
          {SELLER_CONFIGURED && <p>{legalSeller(locale === "ru" ? "ru" : "en")}</p>}
          <p>{t("copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
