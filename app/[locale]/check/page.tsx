import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { CheckForm } from "@/components/check/check-form";
import { ClientMessages } from "@/components/client-messages";
import type { Locale } from "@/i18n/routing";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/check">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "check" });
  return { title: `${t("title")} — ${SITE_NAME}`, alternates: { canonical: `/${locale}/check` } };
}

/** /check по прямой ссылке или после обновления страницы — та же форма отдельной страницей. */
export default async function CheckPage({ params }: PageProps<"/[locale]/check">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <section className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <ClientMessages namespaces={["check"]}>
        <Suspense>
          <CheckForm />
        </Suspense>
      </ClientMessages>
    </section>
  );
}
