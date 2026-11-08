import type { Destination, ZoneCode } from "@/lib/rules/types";

const AIRSIDE_OK = {
  ru: "Если не выходите из транзитной зоны аэропорта, въездные документы обычно не нужны. Выходите в город или меняете аэропорт — отметьте страну как «въезжаю».",
  en: "If you stay airside, entry documents are usually not needed. Leaving the airport or changing airports? Mark this stop as “entering”.",
};

export const DESTINATIONS: Record<ZoneCode, Destination> = {
  TH: {
    code: "TH",
    name: { ru: "Таиланд", en: "Thailand" },
    timeZone: "Asia/Bangkok",
    portalUrl: "https://www.thaievisa.go.th/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  VN: {
    code: "VN",
    name: { ru: "Вьетнам", en: "Vietnam" },
    timeZone: "Asia/Ho_Chi_Minh",
    portalUrl: "https://evisa.gov.vn/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  ID: {
    code: "ID",
    name: { ru: "Индонезия", en: "Indonesia" },
    // Окна подачи считаем по времени Бали — главного направления трека RU.
    timeZone: "Asia/Makassar",
    portalUrl: "https://evisa.imigrasi.go.id/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  TR: {
    code: "TR",
    name: { ru: "Турция", en: "Türkiye" },
    timeZone: "Europe/Istanbul",
    portalUrl: "https://www.evisa.gov.tr/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  AE: {
    code: "AE",
    name: { ru: "ОАЭ", en: "United Arab Emirates" },
    timeZone: "Asia/Dubai",
    portalUrl: "https://u.ae/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  EG: {
    code: "EG",
    name: { ru: "Египет", en: "Egypt" },
    timeZone: "Africa/Cairo",
    portalUrl: "https://www.visa2egypt.gov.eg/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  LK: {
    code: "LK",
    name: { ru: "Шри-Ланка", en: "Sri Lanka" },
    timeZone: "Asia/Colombo",
    portalUrl: "https://eta.gov.lk/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  MY: {
    code: "MY",
    name: { ru: "Малайзия", en: "Malaysia" },
    timeZone: "Asia/Kuala_Lumpur",
    portalUrl: "https://www.imi.gov.my/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  IN: {
    code: "IN",
    name: { ru: "Индия", en: "India" },
    timeZone: "Asia/Kolkata",
    portalUrl: "https://indianvisaonline.gov.in/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  CN: {
    code: "CN",
    name: { ru: "Китай", en: "China" },
    timeZone: "Asia/Shanghai",
    portalUrl: "https://cs.mfa.gov.cn/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  GB: {
    code: "GB",
    name: { ru: "Великобритания", en: "United Kingdom" },
    timeZone: "Europe/London",
    portalUrl: "https://www.gov.uk/check-uk-visa",
    transit: {
      airsideOk: true,
      note: {
        ru: "При пересадке без прохождения паспортного контроля ETA не нужна. Гражданам некоторых стран нужна транзитная виза — проверьте на gov.uk.",
        en: "No ETA is needed if you transit without passing through border control. Some nationalities need a transit visa — check gov.uk.",
      },
    },
  },
  SCHENGEN: {
    code: "SCHENGEN",
    name: { ru: "Шенгенская зона", en: "Schengen Area" },
    timeZone: "Europe/Paris",
    portalUrl: "https://travel-europe.europa.eu/",
    transit: {
      airsideOk: true,
      note: {
        ru: "Пересаживаетесь на рейс внутри Шенгена — паспортный контроль проходите в первом аэропорту зоны, и там действуют правила въезда.",
        en: "Connecting to another Schengen flight? You clear passport control at the first Schengen airport, and entry rules apply there.",
      },
    },
  },
  SG: {
    code: "SG",
    name: { ru: "Сингапур", en: "Singapore" },
    timeZone: "Asia/Singapore",
    portalUrl: "https://www.ica.gov.sg/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  KR: {
    code: "KR",
    name: { ru: "Южная Корея", en: "South Korea" },
    timeZone: "Asia/Seoul",
    portalUrl: "https://www.k-eta.go.kr/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  JP: {
    code: "JP",
    name: { ru: "Япония", en: "Japan" },
    timeZone: "Asia/Tokyo",
    portalUrl: "https://www.mofa.go.jp/j_info/visit/visa/",
    transit: { airsideOk: true, note: AIRSIDE_OK },
  },
  US: {
    code: "US",
    name: { ru: "США", en: "United States" },
    timeZone: "America/New_York",
    portalUrl: "https://travel.state.gov/",
    transit: {
      airsideOk: false,
      note: {
        ru: "В аэропортах США нет транзитной зоны: даже при пересадке вы проходите паспортный контроль, поэтому нужны ESTA или виза.",
        en: "US airports have no airside transit: even when connecting you pass border control, so you need an ESTA or a visa.",
      },
    },
  },
};
