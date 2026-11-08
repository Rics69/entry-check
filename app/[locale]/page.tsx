import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import type { Locale } from "@/i18n/routing";

// Заготовка первого экрана. Полный лендинг из 11 блоков — фаза 3, проверка маршрута — фаза 4.
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations("home");

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted text-pretty">
        {t("subtitle")}
      </p>
      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          type="button"
          disabled
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-on-accent shadow-sm transition hover:-translate-y-px hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-accent"
        >
          {t("cta")}
        </button>
        <p className="text-sm text-muted">{t("ctaNote")}</p>
      </div>
    </section>
  );
}
