import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LEGAL_EN } from "@/content/legal/en";
import { LEGAL_RU } from "@/content/legal/ru";
import { LEGAL_DOCS, LEGAL_EDITION, type LegalDoc, type LegalDocId } from "@/content/legal/types";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { formatDay } from "@/lib/format";
import { legalSeller, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ doc }));
}

function getDoc(locale: string, doc: string): LegalDoc | null {
  if (!hasLocale(routing.locales, locale) || !(LEGAL_DOCS as readonly string[]).includes(doc)) return null;
  return (locale === "ru" ? LEGAL_RU : LEGAL_EN)[doc as LegalDocId];
}

/** Подстановка реквизитов: {seller}, {email}, {site}. */
function fill(text: string, locale: Locale): string {
  return text
    .replaceAll("{seller}", legalSeller(locale))
    .replaceAll("{email}", SUPPORT_EMAIL)
    .replaceAll("{site}", SITE_URL.replace(/^https?:\/\//, ""));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/[doc]">): Promise<Metadata> {
  const { locale, doc } = await params;
  const content = getDoc(locale, doc);
  if (!content) return {};
  return {
    title: `${content.title} — ${SITE_NAME}`,
    alternates: { canonical: `/${locale}/legal/${doc}`, languages: { ru: `/ru/legal/${doc}`, en: `/en/legal/${doc}` } },
  };
}

export default function LegalPage({ params }: PageProps<"/[locale]/legal/[doc]">) {
  const { locale, doc } = use(params);
  const content = getDoc(locale, doc);
  if (!content) notFound();
  setRequestLocale(locale as Locale);
  const t = useTranslations("legal");

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← {t("back")}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h1>
      <p className="mt-2 text-sm text-muted">{t("edition", { date: formatDay(LEGAL_EDITION, locale, true) })}</p>

      {content.intro && <p className="mt-8 text-lg leading-relaxed">{fill(content.intro, locale as Locale)}</p>}

      {content.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 leading-relaxed text-muted">
              {fill(paragraph, locale as Locale)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
