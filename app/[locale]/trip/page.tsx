import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { TripView } from "@/components/check/trip-view";
import { ClientMessages } from "@/components/client-messages";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/trip">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "tripPage" });
  // Страницы с маршрутом в параметре не индексируем: их бесконечно много и они личные.
  return { title: t("metaTitle"), robots: { index: false, follow: true } };
}

/** Статическая оболочка; сам результат считает TripView в браузере по ?d=. */
export default async function TripPage({ params }: PageProps<"/[locale]/trip">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "tripPage" });

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14 print:max-w-none print:p-0">
      <ClientMessages namespaces={["trip", "tripPage"]}>
        <Suspense fallback={<p className="py-16 text-center text-muted">{t("loading")}</p>}>
          <TripView />
        </Suspense>
      </ClientMessages>
    </section>
  );
}
