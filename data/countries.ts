import type { Text, ZoneCode } from "@/lib/rules/types";

export type Country = {
  code: string;
  name: Text;
  /** Другие написания для поиска: "UAE", "Дубай", "Holland". */
  aliases?: string[];
  /** В какую зону правил попадает въезд в эту страну. Нет поля — не направление MVP. */
  zone?: ZoneCode;
};

const SCHENGEN = "SCHENGEN" as const;

/** Все страны, которые встречаются в MVP: паспорта обоих треков и направления. */
export const COUNTRIES: Country[] = [
  // Паспорта трека RU
  { code: "RU", name: { ru: "Россия", en: "Russia" }, aliases: ["РФ", "Russian Federation"] },
  { code: "KZ", name: { ru: "Казахстан", en: "Kazakhstan" } },
  { code: "BY", name: { ru: "Беларусь", en: "Belarus" }, aliases: ["Белоруссия"] },
  { code: "UZ", name: { ru: "Узбекистан", en: "Uzbekistan" } },
  { code: "KG", name: { ru: "Кыргызстан", en: "Kyrgyzstan" }, aliases: ["Киргизия", "Kyrgyz Republic"] },
  { code: "AM", name: { ru: "Армения", en: "Armenia" } },

  // Паспорта трека EN (часть — ещё и направления)
  { code: "US", name: { ru: "США", en: "United States" }, aliases: ["USA", "America", "Америка", "Соединённые Штаты"], zone: "US" },
  { code: "GB", name: { ru: "Великобритания", en: "United Kingdom" }, aliases: ["UK", "Britain", "England", "Англия", "Лондон", "London"], zone: "GB" },
  { code: "DE", name: { ru: "Германия", en: "Germany" }, zone: SCHENGEN },
  { code: "FR", name: { ru: "Франция", en: "France" }, aliases: ["Париж", "Paris"], zone: SCHENGEN },
  { code: "IT", name: { ru: "Италия", en: "Italy" }, aliases: ["Рим", "Rome"], zone: SCHENGEN },
  { code: "ES", name: { ru: "Испания", en: "Spain" }, aliases: ["Барселона", "Barcelona"], zone: SCHENGEN },
  { code: "NL", name: { ru: "Нидерланды", en: "Netherlands" }, aliases: ["Голландия", "Holland", "Амстердам", "Amsterdam"], zone: SCHENGEN },
  { code: "PL", name: { ru: "Польша", en: "Poland" }, zone: SCHENGEN },
  { code: "CA", name: { ru: "Канада", en: "Canada" } },
  { code: "AU", name: { ru: "Австралия", en: "Australia" } },

  // Направления
  { code: "TH", name: { ru: "Таиланд", en: "Thailand" }, aliases: ["Тайланд", "Пхукет", "Phuket", "Бангкок", "Bangkok"], zone: "TH" },
  { code: "VN", name: { ru: "Вьетнам", en: "Vietnam" }, aliases: ["Viet Nam", "Нячанг", "Хошимин"], zone: "VN" },
  { code: "ID", name: { ru: "Индонезия", en: "Indonesia" }, aliases: ["Бали", "Bali", "Джакарта", "Jakarta"], zone: "ID" },
  { code: "TR", name: { ru: "Турция", en: "Türkiye" }, aliases: ["Turkey", "Стамбул", "Istanbul", "Анталья"], zone: "TR" },
  { code: "AE", name: { ru: "ОАЭ", en: "United Arab Emirates" }, aliases: ["UAE", "Эмираты", "Дубай", "Dubai", "Абу-Даби"], zone: "AE" },
  { code: "EG", name: { ru: "Египет", en: "Egypt" }, aliases: ["Хургада", "Шарм-эль-Шейх"], zone: "EG" },
  { code: "LK", name: { ru: "Шри-Ланка", en: "Sri Lanka" }, aliases: ["Цейлон"], zone: "LK" },
  { code: "MY", name: { ru: "Малайзия", en: "Malaysia" }, aliases: ["Куала-Лумпур", "Kuala Lumpur"], zone: "MY" },
  { code: "IN", name: { ru: "Индия", en: "India" }, aliases: ["Гоа", "Goa"], zone: "IN" },
  { code: "CN", name: { ru: "Китай", en: "China" }, aliases: ["КНР", "Пекин", "Шанхай"], zone: "CN" },
  { code: "SG", name: { ru: "Сингапур", en: "Singapore" }, zone: "SG" },
  { code: "KR", name: { ru: "Южная Корея", en: "South Korea" }, aliases: ["Корея", "Korea", "Сеул", "Seoul"], zone: "KR" },
  { code: "JP", name: { ru: "Япония", en: "Japan" }, aliases: ["Токио", "Tokyo"], zone: "JP" },

  // Остальные страны Шенгенской зоны
  { code: "AT", name: { ru: "Австрия", en: "Austria" }, zone: SCHENGEN },
  { code: "BE", name: { ru: "Бельгия", en: "Belgium" }, zone: SCHENGEN },
  { code: "BG", name: { ru: "Болгария", en: "Bulgaria" }, zone: SCHENGEN },
  { code: "HR", name: { ru: "Хорватия", en: "Croatia" }, zone: SCHENGEN },
  { code: "CZ", name: { ru: "Чехия", en: "Czechia" }, aliases: ["Czech Republic", "Прага", "Prague"], zone: SCHENGEN },
  { code: "DK", name: { ru: "Дания", en: "Denmark" }, zone: SCHENGEN },
  { code: "EE", name: { ru: "Эстония", en: "Estonia" }, zone: SCHENGEN },
  { code: "FI", name: { ru: "Финляндия", en: "Finland" }, zone: SCHENGEN },
  { code: "GR", name: { ru: "Греция", en: "Greece" }, zone: SCHENGEN },
  { code: "HU", name: { ru: "Венгрия", en: "Hungary" }, zone: SCHENGEN },
  { code: "IS", name: { ru: "Исландия", en: "Iceland" }, zone: SCHENGEN },
  { code: "LV", name: { ru: "Латвия", en: "Latvia" }, zone: SCHENGEN },
  { code: "LI", name: { ru: "Лихтенштейн", en: "Liechtenstein" }, zone: SCHENGEN },
  { code: "LT", name: { ru: "Литва", en: "Lithuania" }, zone: SCHENGEN },
  { code: "LU", name: { ru: "Люксембург", en: "Luxembourg" }, zone: SCHENGEN },
  { code: "MT", name: { ru: "Мальта", en: "Malta" }, zone: SCHENGEN },
  { code: "NO", name: { ru: "Норвегия", en: "Norway" }, zone: SCHENGEN },
  { code: "PT", name: { ru: "Португалия", en: "Portugal" }, aliases: ["Лиссабон", "Lisbon"], zone: SCHENGEN },
  { code: "RO", name: { ru: "Румыния", en: "Romania" }, zone: SCHENGEN },
  { code: "SK", name: { ru: "Словакия", en: "Slovakia" }, zone: SCHENGEN },
  { code: "SI", name: { ru: "Словения", en: "Slovenia" }, zone: SCHENGEN },
  { code: "SE", name: { ru: "Швеция", en: "Sweden" }, zone: SCHENGEN },
  { code: "CH", name: { ru: "Швейцария", en: "Switzerland" }, zone: SCHENGEN },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string): Country | undefined {
  return BY_CODE.get(code);
}

/** Граждане ЕС: внутри Шенгена у них свобода передвижения. В MVP — только паспорта трека EN. */
export const EU_PASSPORTS = ["DE", "FR", "IT", "ES", "NL", "PL"] as const;

/** Паспорта, которые можно выбрать в проверке, и популярные по трекам — наверху списка. */
export const PASSPORTS = {
  ru: ["RU", "KZ", "BY", "UZ", "KG", "AM"],
  en: ["US", "GB", "DE", "FR", "IT", "ES", "NL", "PL", "CA", "AU"],
} as const;

export const ALL_PASSPORTS: string[] = [...PASSPORTS.ru, ...PASSPORTS.en];

/** Популярные направления по трекам — наверху списка выбора страны. */
export const POPULAR_DESTINATIONS = {
  ru: ["TH", "VN", "ID", "TR", "AE", "EG", "LK", "MY", "IN", "CN"],
  en: ["GB", "FR", "IT", "ES", "DE", "TH", "VN", "ID", "MY", "SG", "IN", "KR", "JP", "US"],
} as const;

/** Все страны, которые можно выбрать точкой маршрута. */
export const DESTINATION_COUNTRIES: Country[] = COUNTRIES.filter((c) => c.zone);

/** Флаг-эмодзи по ISO-коду. */
export function flagEmoji(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
}
