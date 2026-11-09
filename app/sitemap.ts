import type { MetadataRoute } from "next";
import { LEGAL_DOCS, LEGAL_EDITION } from "@/content/legal/types";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

/** Лендинг и юридические страницы на обоих языках, со ссылками на языковые версии. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", ...LEGAL_DOCS.map((doc) => `/legal/${doc}`)];
  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: path ? LEGAL_EDITION : undefined,
      changeFrequency: path ? ("yearly" as const) : ("weekly" as const),
      priority: path ? 0.3 : 1,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
      },
    })),
  );
}
