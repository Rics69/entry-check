import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted">
        <p>{t("disclaimer")}</p>
        <p>{t("copyright", { year })}</p>
      </div>
    </footer>
  );
}
