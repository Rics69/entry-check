import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { BellIcon, CheckIcon, ListIcon, RouteIcon, ShieldIcon } from "@/components/icons";
import { ClientMessages } from "@/components/client-messages";
import { HeroGlobe } from "@/components/landing/hero-globe";
import { LiveCard } from "@/components/landing/live-card";
import { MagneticTitle } from "@/components/landing/magnetic-title";
import { Meteors } from "@/components/landing/meteors";
import { RetroPixelLink } from "@/components/ui/retro-pixel-link";
import { globeMarkers, globeRoute } from "@/content/globe-points";
import { SiteCheck, type PortalLink } from "@/components/landing/site-check";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { StopCard } from "@/components/trip/stop-card";
import { TripSummaryText } from "@/components/trip/trip-summary";
import { sampleTrip, todayUtc } from "@/content/sample-trips";
import { DESTINATIONS } from "@/data/destinations";
import { RULES } from "@/data/requirements";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { countryName, displayHost, zoneName } from "@/lib/format";
import { formatTripPackPrice } from "@/lib/pricing";
import { evaluateTrip } from "@/lib/rules/engine";
import { findOfficialDomain } from "@/lib/rules/official";
import type { RequirementKind, ZoneCode } from "@/lib/rules/types";

const PRIMARY_CTA =
  "press inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg bg-accent px-6 text-base font-medium text-on-accent shadow-sm hover:bg-accent-hover hover:shadow-md";

const FAQ_KEYS = ["gov", "apply", "data", "pack", "changes", "refund"] as const;

/** Лендинг по структуре OnwardAir: 11 блоков, шапка и подвал — в layout. */
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = use(params);
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = useTranslations("landing");

  // Образец считается настоящим движком по сверенным правилам на момент сборки.
  const today = todayUtc();
  const trip = sampleTrip(locale, today);
  const result = evaluateTrip(trip, { now: new Date(`${today}T00:00:00Z`) });
  const routeLabel = trip.stops.map((s) => countryName(s.country, locale)).join(" → ");
  const route = globeRoute(trip);

  const zoneNames = Object.fromEntries(
    Object.keys(DESTINATIONS).map((z) => [z, zoneName(z as ZoneCode, locale)]),
  ) as Record<ZoneCode, string>;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: t(`faq.items.${key}.q`),
      acceptedAnswer: { "@type": "Answer", text: t.markup(`faq.items.${key}.a`, { link: (chunks) => chunks }) },
    })),
  };

  return (
    <>
      {/* 2–3. Первый экран и живая карточка. Фон: метеоры и глобус с маршрутом из примера. */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <Meteors />
          <HeroGlobe
            markers={globeMarkers()}
            arcs={route.arcs}
            focus={route.focus}
            className="absolute top-[52%] left-1/2 w-[min(760px,150vw)] -translate-x-1/2 opacity-50 sm:top-[46%] lg:top-1/2 lg:right-[-8%] lg:left-auto lg:w-[780px] lg:translate-x-0 lg:-translate-y-1/2 lg:opacity-100"
          />
          {/* Глобус уходит в фон к краям и не спорит с текстом слева. */}
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_30%,var(--background)_35%,transparent_75%)] max-lg:bg-[linear-gradient(to_bottom,var(--background)_30%,transparent_70%,var(--background))]" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-28 max-sm:pt-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
              <span className="size-2 rounded-full bg-ok" aria-hidden="true" />
              {t("hero.eyebrow")}
            </p>
            <MagneticTitle
              text={t("hero.title")}
              className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl xl:leading-[1.05]"
            />
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-col items-start gap-3">
              <RetroPixelLink href="/check">{t("hero.cta")}</RetroPixelLink>
              <span className="text-sm text-muted">{t("hero.ctaNote")}</span>
            </div>
            <ul className="mt-10 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
              {(["official", "verified", "noMarkup"] as const).map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-ok" />
                  {t(`hero.points.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          <LiveCard result={result} />
        </div>
      </section>

      {/* 4. Как это работает */}
      <section id="how" className="scroll-mt-20 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("how.title")}</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {([
              ["route", RouteIcon],
              ["list", ListIcon],
              ["remind", BellIcon],
            ] as const).map(([key, Icon], i) => (
              <li key={key} className="flex flex-col gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">
                  <span className="text-muted">{i + 1}.</span> {t(`how.steps.${key}.title`)}
                </h3>
                <p className="leading-relaxed text-muted">{t(`how.steps.${key}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Образец результата */}
      <section id="sample" className="scroll-mt-20 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("sample.title")}</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted">{t("sample.subtitle")}</p>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 rounded-xl border border-border bg-surface px-5 py-4">
            <p className="text-sm text-muted">
              {t("sample.route", { passport: countryName(trip.passport, locale), route: routeLabel })}
            </p>
            <TripSummaryText summary={result.summary} className="font-medium" />
          </div>
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
            {result.stops.map((stop, i) => (
              <StopCard key={stop.stopIndexes.join("-")} stop={stop} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. Проверьте сайт */}
      <section id="site-check" className="scroll-mt-20 bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("siteCheck.title")}</h2>
            <p className="mt-3 text-lg leading-relaxed text-muted">{t("siteCheck.subtitle")}</p>
            <p className="mt-6 border-l-2 border-warn pl-4 text-sm leading-relaxed text-muted">{t("siteCheck.why")}</p>
          </div>
          <ClientMessages namespaces={["siteCheck"]}>
            <SiteCheck portals={buildPortals(locale)} zoneNames={zoneNames} />
          </ClientMessages>
        </div>
      </section>

      {/* 7. Цены */}
      <section id="pricing" className="scroll-mt-20 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("pricing.title")}</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted">{t("pricing.subtitle")}</p>
          <div className="mt-10 grid items-start gap-6 md:grid-cols-3">
            <PlanCard name={t("pricing.free.name")} price={t("pricing.free.price")}>
              <Features items={(["all", "official", "share"] as const).map((k) => t(`pricing.free.features.${k}`))} />
              <Link href="/check" data-sound="press" className="press mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-border-strong px-5 font-medium hover:border-accent hover:text-accent">
                {t("pricing.free.cta")}
              </Link>
            </PlanCard>

            <PlanCard
              name={t("pricing.tripPack.name")}
              price={formatTripPackPrice(locale)}
              per={t("pricing.tripPack.per")}
              badge={t("pricing.tripPack.badge")}
              highlighted
            >
              <Features items={(["pdf", "remind", "recheck", "changes"] as const).map((k) => t(`pricing.tripPack.features.${k}`))} />
              <Link href="/check" data-sound="press" className={`${PRIMARY_CTA} mt-6 w-full`}>
                {t("pricing.tripPack.cta")}
              </Link>
              <p className="mt-3 text-center text-sm text-muted">{t("pricing.tripPack.note")}</p>
            </PlanCard>

            <PlanCard name={t("pricing.pass.name")} badge={t("pricing.pass.badge")} muted>
              <p className="leading-relaxed text-muted">{t("pricing.pass.text")}</p>
              <div className="mt-6">
                <ClientMessages namespaces={["waitlist"]}>
                  <WaitlistForm submitLabel={t("pricing.pass.cta")} source="pricing" />
                </ClientMessages>
              </div>
            </PlanCard>
          </div>
        </div>
      </section>

      {/* 8. Гарантия */}
      <section className="bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:flex-row sm:items-start sm:py-20">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ok-soft text-ok">
            <ShieldIcon className="size-7" />
          </span>
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("guarantee.title")}</h2>
            <p className="mt-3 text-lg leading-relaxed">{t("guarantee.text")}</p>
            <p className="mt-2 text-lg leading-relaxed text-muted">{t("guarantee.process")}</p>
          </div>
        </div>
      </section>

      {/* 9. Вопросы */}
      <section id="faq" className="scroll-mt-20 border-y border-border">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("faq.title")}</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {FAQ_KEYS.map((key) => (
              <details key={key} className="group">
                <summary data-sound="tap" className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {t(`faq.items.${key}.q`)}
                  <span className="text-2xl leading-none font-normal text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="pb-5 leading-relaxed text-muted">
                  {t.rich(`faq.items.${key}.a`, {
                    link: (chunks) => (
                      <Link href="/legal/refunds" className="text-accent hover:underline">
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Финальный призыв */}
      <section className="bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t("final.title")}</h2>
          <Link href="/check" data-sound="press" className={PRIMARY_CTA}>
            {t("final.cta")}
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        // JSON из наших же переводов; экранируем "<", чтобы текст не мог закрыть тег script.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}

function PlanCard({
  name,
  price,
  per,
  badge,
  highlighted = false,
  muted = false,
  children,
}: {
  name: string;
  price?: string;
  per?: string;
  badge?: string;
  highlighted?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-surface p-6 ${
        highlighted ? "border-accent shadow-[0_4px_6px_rgba(0,0,0,0.07),0_2px_4px_rgba(0,0,0,0.05)]" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{name}</h3>
        {badge && (
          <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${muted ? "bg-background text-muted" : "bg-accent-soft text-accent"}`}>
            {badge}
          </span>
        )}
      </div>
      {price && (
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight">{price}</span>
          {per && <span className="text-muted">{per}</span>}
        </p>
      )}
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-snug">
          <CheckIcon className="mt-0.5 size-5 shrink-0 text-ok" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Официальные порталы по зонам для подсказки «Проверьте сайт»: сначала формы и разрешения. */
const KIND_ORDER: RequirementKind[] = ["arrival_card", "eta", "evisa", "visa_on_arrival", "visa", "levy", "visa_free", "info"];

function buildPortals(locale: Locale): Partial<Record<ZoneCode, PortalLink[]>> {
  const lang = locale === "ru" ? "ru" : "en";
  const portals: Partial<Record<ZoneCode, PortalLink[]>> = {};
  const sorted = [...RULES].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  for (const rule of sorted) {
    const list = (portals[rule.destination] ??= []);
    const host = displayHost(rule.officialUrl);
    if (list.length >= 3 || list.some((p) => p.host === host)) continue;
    const label = findOfficialDomain(rule.officialUrl)?.label[lang] ?? host;
    list.push({ label, url: rule.officialUrl, host });
  }
  return portals;
}
