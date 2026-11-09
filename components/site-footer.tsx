import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";
import { LogoMark } from "./logo";

const DOCS = ["terms", "privacy", "refunds"] as const;

export function SiteFooter() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 text-sm text-muted">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <LogoMark className="size-6 text-accent" />
            <span className="font-semibold">{SITE_NAME}</span>
          </Link>
          <nav aria-label={t("legalNav")} className="flex flex-wrap gap-x-6 gap-y-3">
            {DOCS.map((doc) => (
              <Link key={doc} href={`/legal/${doc}`} className="transition-colors hover:text-foreground">
                {t(doc)}
              </Link>
            ))}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-foreground">
              {t("contacts")}
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <p>{t("disclaimer")}</p>
          <p>{t("payments")}</p>
          <p>{t("copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
