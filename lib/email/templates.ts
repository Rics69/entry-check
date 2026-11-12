import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { countryName, displayHost, formatDay, formatFee } from "@/lib/format";
import type { TripResult } from "@/lib/rules/engine";
import type { Requirement, Trip } from "@/lib/rules/types";
import { formatLocal } from "@/lib/rules/windows";

/**
 * Письма Trip Pack — простой HTML с инлайн-стилями и текстовая версия.
 * Без React Email: меньше зависимостей и процессорного времени в воркере; тексты — в messages/*.json (раздел email).
 */

export type RenderedEmail = { subject: string; html: string; text: string };
type Lang = "ru" | "en";

const tr = (locale: Lang) => createTranslator({ locale, messages: locale === "ru" ? ru : en, namespace: "email" });

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function button(label: string, url: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;margin:4px 8px 4px 0">${esc(label)}</a>`;
}

function layout(locale: Lang, title: string, body: string): string {
  const t = tr(locale);
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="font-weight:700;font-size:18px;margin:0 0 16px">Entry Check</p>
<div style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;padding:24px">
<h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${esc(title)}</h1>
${body}
</div>
<p style="font-size:13px;color:#6b6b6b;line-height:1.5;margin:16px 0 0">${esc(t("footer"))}</p>
</div></body></html>`;
}

const p = (text: string) => `<p style="font-size:16px;line-height:1.55;margin:0 0 12px">${esc(text)}</p>`;

function links(locale: Lang, siteUrl: string, orderId: string, withPrint: boolean) {
  const t = tr(locale);
  const trip = `${siteUrl}/${locale}/trip/${orderId}`;
  const print = `${trip}/print`;
  return {
    html: `<p style="margin:16px 0 0">${button(t("openTrip"), trip)}${withPrint ? button(t("printChecklist"), print) : ""}</p>`,
    text: `${t("openTrip")}: ${trip}${withPrint ? `\n${t("printChecklist")}: ${print}` : ""}`,
  };
}

const routeOf = (trip: Trip, locale: Lang) => trip.stops.map((s) => countryName(s.country, locale)).join(" → ");

/** Что сделать по одному требованию — строка чек-листа. null — ничего делать не нужно. */
function actionLine(rule: Requirement, item: TripResult["stops"][number]["extras"][number], locale: Lang): string | null {
  const t = tr(locale);
  const name = rule.name[locale];
  if (item.window) {
    if (item.window.state === "upcoming") {
      const withTime = item.window.unit === "hours" && item.window.exactTime;
      return t("checklist.window", { name, date: formatLocal(item.window.opensAt, locale, item.window.timeZone, withTime) });
    }
    if (item.window.state === "open") return t("checklist.windowOpen", { name });
    return null;
  }
  if (item.status === "red" && item.applyBy) return t("checklist.applyBy", { name, date: formatDay(item.applyBy, locale) });
  if (item.status === "yellow" && rule.fee) return t("checklist.pay", { name, fee: formatFee(rule.fee, locale) ?? "" });
  if (item.status === "red") return name;
  return null;
}

export type ReminderLine = { kind: "window_open" | "recheck_72h"; sendAt: string; ruleName?: string };

export function checklistEmail(input: {
  locale: Lang;
  siteUrl: string;
  orderId: string;
  trip: Trip;
  result: TripResult;
  reminders: ReminderLine[];
  /** Дословный текст галочек при оплате. В ЕС согласие на немедленное исполнение подтверждается письменно. */
  consent?: string[] | null;
}): RenderedEmail {
  const { locale, trip, result } = input;
  const t = tr(locale);
  const route = routeOf(trip, locale);
  const html: string[] = [p(t("checklist.intro", { route, passport: countryName(trip.passport, locale) }))];
  const text: string[] = [t("checklist.intro", { route, passport: countryName(trip.passport, locale) }), ""];

  result.stops.forEach((stop, i) => {
    const heading = t("checklist.stop", {
      n: i + 1,
      country: stop.countries.map((c) => countryName(c, locale)).join(", "),
      date: formatDay(stop.arrivalDate, locale),
    });
    const lines: { text: string; url?: string }[] = [];
    for (const item of [...(stop.entry ? [stop.entry] : []), ...stop.extras]) {
      const line = actionLine(item.requirement, item, locale);
      if (line) lines.push({ text: line, url: item.requirement.officialUrl });
    }
    if (stop.passportValidity && lines.length) lines.push({ text: t("checklist.passport", { text: stop.passportValidity[locale] }) });

    html.push(`<h2 style="font-size:17px;margin:20px 0 8px">${esc(heading)}</h2>`);
    text.push(heading);
    if (!lines.length) {
      html.push(p(t("checklist.nothing")));
      text.push(`  ${t("checklist.nothing")}`);
    } else {
      html.push(
        `<ul style="padding-left:20px;margin:0 0 8px">${lines
          .map(
            (l) =>
              `<li style="font-size:15px;line-height:1.5;margin:0 0 6px">${esc(l.text)}${
                l.url ? ` — <a href="${esc(l.url)}" style="color:#1d4ed8">${esc(displayHost(l.url))}</a>` : ""
              }</li>`,
          )
          .join("")}</ul>`,
      );
      for (const l of lines) text.push(`  ☐ ${l.text}${l.url ? ` — ${l.url}` : ""}`);
    }
  });

  if (input.reminders.length) {
    html.push(`<h2 style="font-size:17px;margin:20px 0 8px">${esc(t("checklist.reminders"))}</h2>`);
    text.push("", t("checklist.reminders"));
    const items = input.reminders.map((r) => {
      const date = formatDay(r.sendAt.slice(0, 10), locale);
      return r.kind === "window_open"
        ? t("checklist.reminderWindow", { date, name: r.ruleName ?? "" })
        : t("checklist.reminderRecheck", { date });
    });
    html.push(`<ul style="padding-left:20px;margin:0 0 8px">${items.map((i) => `<li style="font-size:15px;line-height:1.5">${esc(i)}</li>`).join("")}</ul>`);
    for (const i of items) text.push(`  • ${i}`);
  }

  html.push(p(t("checklist.guarantee")));
  text.push("", t("checklist.guarantee"));
  const l = links(locale, input.siteUrl, input.orderId, true);
  html.push(l.html);
  text.push("", l.text);

  if (input.consent?.length) {
    const quote = (s: string) => (locale === "ru" ? `«${s}»` : `“${s}”`);
    const small = "font-size:13px;line-height:1.5;color:#6b6b6b";
    const items = input.consent.map((c) => `<li style="margin:0 0 4px">${esc(quote(c))}</li>`).join("");
    html.push(
      `<div style="border-top:1px solid #e5e5e5;margin:20px 0 0;padding:12px 0 0">` +
        `<p style="${small};margin:0 0 6px">${esc(t("checklist.consent"))}</p>` +
        `<ul style="${small};padding-left:20px;margin:0">${items}</ul></div>`,
    );
    text.push("", t("checklist.consent"), ...input.consent.map((c) => `  ${quote(c)}`));
  }
  text.push("", t("footer"));

  return {
    subject: t("checklist.subject", { route }),
    html: layout(locale, t("checklist.title"), html.join("\n")),
    text: text.join("\n"),
  };
}

export function windowOpenEmail(input: {
  locale: Lang;
  siteUrl: string;
  orderId: string;
  rule: Requirement;
  country: string;
  arrivalDate: string;
}): RenderedEmail {
  const { locale, rule } = input;
  const t = tr(locale);
  const name = rule.name[locale];
  const body = t("windowOpen.body", { name, country: countryName(input.country, locale), date: formatDay(input.arrivalDate, locale) });
  const l = links(locale, input.siteUrl, input.orderId, false);
  return {
    subject: t("windowOpen.subject", { name }),
    html: layout(locale, t("windowOpen.title"), `${p(body)}<p style="margin:16px 0 0">${button(t("windowOpen.cta"), rule.officialUrl)}</p>${l.html}`),
    text: `${body}\n\n${t("windowOpen.cta")}: ${rule.officialUrl}\n${l.text}\n\n${t("footer")}`,
  };
}

export function recheckEmail(input: { locale: Lang; siteUrl: string; orderId: string; country: string; arrivalDate: string }): RenderedEmail {
  const { locale } = input;
  const t = tr(locale);
  const body = t("recheck.body", { country: countryName(input.country, locale), date: formatDay(input.arrivalDate, locale) });
  const l = links(locale, input.siteUrl, input.orderId, true);
  return {
    subject: t("recheck.subject"),
    html: layout(locale, t("recheck.title"), `${p(body)}${l.html}`),
    text: `${body}\n\n${l.text}\n\n${t("footer")}`,
  };
}

export function rulesChangedEmail(input: { locale: Lang; siteUrl: string; orderId: string; countries: string[] }): RenderedEmail {
  const { locale } = input;
  const t = tr(locale);
  const body = t("rulesChanged.body", { countries: input.countries.map((c) => countryName(c, locale)).join(", ") });
  const l = links(locale, input.siteUrl, input.orderId, true);
  return {
    subject: t("rulesChanged.subject"),
    html: layout(locale, t("rulesChanged.title"), `${p(body)}${l.html}`),
    text: `${body}\n\n${l.text}\n\n${t("footer")}`,
  };
}
