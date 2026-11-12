import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ClientMessages } from "@/components/client-messages";
import { MockCheckout } from "@/components/pay/pay-status";
import type { Locale } from "@/i18n/routing";
import { paymentsMode } from "@/lib/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/pay/mock">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pay" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Тестовая страница оплаты (режим mock): кнопки «Оплатить» и «Отказаться» вместо формы RollyPay. */
export default async function Page({ params }: PageProps<"/[locale]/pay/mock">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <ClientMessages namespaces={["pay"]}>
        <Suspense>
          <MockCheckout enabled={paymentsMode() === "mock"} />
        </Suspense>
      </ClientMessages>
    </section>
  );
}
