import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ClientMessages } from "@/components/client-messages";
import { PayFail } from "@/components/pay/pay-status";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/pay/fail">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pay" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Возврат после неудачной оплаты: «Попробовать ещё раз» ведёт на ту же проверку маршрута. */
export default async function Page({ params }: PageProps<"/[locale]/pay/fail">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <ClientMessages namespaces={["pay"]}>
        <Suspense>
          <PayFail />
        </Suspense>
      </ClientMessages>
    </section>
  );
}
