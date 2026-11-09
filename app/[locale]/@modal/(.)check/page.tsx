import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { CheckForm } from "@/components/check/check-form";
import { Modal } from "@/components/check/modal";
import { ClientMessages } from "@/components/client-messages";
import type { Locale } from "@/i18n/routing";
import { SITE_NAME } from "@/lib/site";

const TITLE_ID = "check-title";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "check" });
  return { title: `${t("title")} — ${SITE_NAME}` };
}

/** Перехват /check при переходе по ссылке внутри сайта: форма открывается попапом поверх текущей страницы. */
export default async function CheckModalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "check" });

  return (
    <ClientMessages namespaces={["check"]}>
      <Modal labelledBy={TITLE_ID} closeLabel={t("close")}>
        <Suspense>
          <CheckForm titleId={TITLE_ID} />
        </Suspense>
      </Modal>
    </ClientMessages>
  );
}
