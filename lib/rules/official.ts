import OFFICIAL_DOMAINS from "@/data/official-domains.json";
import type { Text, ZoneCode } from "./types";

export type OfficialDomain = { domain: string; label: Text };
export type OfficialMatch = OfficialDomain & { zone: ZoneCode };

const DOMAINS = OFFICIAL_DOMAINS as Record<ZoneCode, OfficialDomain[]>;

/** Хост из ссылки или голого домена: "https://www.Gov.UK/eta" → "gov.uk". null — не похоже на адрес. */
export function hostnameOf(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** Хост совпадает с доменом или является его поддоменом: "tdac.immigration.go.th" ⊂ "immigration.go.th". */
function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Официальный ли это сайт и чей. Сверка по списку, без ИИ и без запросов в сеть. */
export function findOfficialDomain(input: string): OfficialMatch | null {
  const host = hostnameOf(input);
  if (!host) return null;
  for (const [zone, domains] of Object.entries(DOMAINS) as [ZoneCode, OfficialDomain[]][]) {
    const found = domains.find((d) => matchesDomain(host, d.domain));
    if (found) return { ...found, zone };
  }
  return null;
}

/** Ведёт ли ссылка на госдомен именно этой зоны. Для автотеста `officialUrl`. */
export function isOfficialUrlFor(url: string, zone: ZoneCode): boolean {
  if (!url.startsWith("https://")) return false;
  const host = hostnameOf(url);
  return Boolean(host && DOMAINS[zone]?.some((d) => matchesDomain(host, d.domain)));
}

export function officialDomainsOf(zone: ZoneCode): OfficialDomain[] {
  return DOMAINS[zone] ?? [];
}

/**
 * По неофициальному адресу угадываем, какую страну ищет человек, чтобы показать настоящий портал:
 * "thailand-tdac-online.com" → TH, "esta-usa.org" → US. Короткие ключи — только целым словом.
 */
const ZONE_KEYWORDS: [ZoneCode, string[]][] = [
  ["TH", ["thai", "tdac"]],
  ["VN", ["vietnam", "viet"]],
  ["ID", ["indonesia", "bali", "evoa"]],
  ["TR", ["turkey", "turkiye", "turk"]],
  ["AE", ["uae", "dubai", "emirates"]],
  ["EG", ["egypt"]],
  ["LK", ["lanka", "ceylon"]],
  ["MY", ["malaysia", "mdac"]],
  ["IN", ["india"]],
  ["CN", ["china", "chinese"]],
  ["GB", ["uk", "britain", "british", "uketa"]],
  ["SCHENGEN", ["etias", "schengen", "europe", "eu"]],
  ["SG", ["singapore", "sgac", "sgarrival"]],
  ["KR", ["korea", "keta"]],
  ["JP", ["japan", "vjw"]],
  ["US", ["esta", "usa", "america", "us"]],
];

export function suggestZonesForHost(host: string): ZoneCode[] {
  const tokens = host.toLowerCase().split(/[.\-_]/).filter(Boolean);
  return ZONE_KEYWORDS.filter(([, words]) =>
    words.some((word) => tokens.some((token) => (word.length <= 3 ? token === word : token.includes(word)))),
  ).map(([zone]) => zone);
}
