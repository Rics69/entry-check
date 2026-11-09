import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@/components/analytics";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

/** Разделы переводов для клиентских компонентов шапки. Страницы добавляют свои через <ClientMessages>. */
const CLIENT_NAMESPACES = ["header"] as const;

function pick<T extends Record<string, unknown>>(source: T, keys: readonly string[]): Partial<T> {
  return Object.fromEntries(keys.filter((k) => k in source).map((k) => [k, source[k]])) as Partial<T>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    applicationName: SITE_NAME,
    alternates: {
      canonical: `/${locale}`,
      languages: { ru: "/ru", en: "/en", "x-default": "/en" },
    },
    openGraph: {
      siteName: SITE_NAME,
      title: t("title"),
      description: t("description"),
      locale: locale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  modal,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Включает статическую генерацию: next-intl берёт язык из параметра, а не из заголовков.
  setRequestLocale(locale);

  // В браузер — только тексты клиентских компонентов, а не все переводы сайта.
  const messages = await getMessages();
  const clientMessages = pick(messages, CLIENT_NAMESPACES);

  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider messages={clientMessages}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
        {/* Попап проверки маршрута (перехват /check), см. app/[locale]/@modal. */}
        {modal}
        <Analytics />
      </body>
    </html>
  );
}
