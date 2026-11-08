/** Текст на двух языках интерфейса. */
export type Text = { ru: string; en: string };

/** Код зоны назначения: ISO-код страны или общая зона вроде Шенгена. */
export type ZoneCode =
  | "TH" | "VN" | "ID" | "TR" | "AE" | "EG" | "LK" | "MY" | "IN" | "CN"
  | "GB" | "SCHENGEN" | "SG" | "KR" | "JP" | "US";

/** Режим въезда: ровно один на пару «паспорт → зона» на дату прилёта. */
export type EntryKind = "visa_free" | "eta" | "evisa" | "visa_on_arrival" | "visa";

/** Дополнительные требования: карты прибытия, сборы, справочные пункты. */
export type ExtraKind = "arrival_card" | "levy" | "info";

export type RequirementKind = EntryKind | ExtraKind;

export const ENTRY_KINDS: readonly EntryKind[] = [
  "visa_free",
  "eta",
  "evisa",
  "visa_on_arrival",
  "visa",
];

/**
 * Одно правило из data/requirements/<ZONE>.json.
 * Схема — из плана MVP, с тремя дополнениями:
 * `verifiedAt: null` для черновиков, `validFrom` / `validUntil` для временных режимов
 * и `recommendDaysBeforeArrival` для срока «подайте заранее».
 */
export type Requirement = {
  /** Уникальный id: "th-tdac". */
  id: string;
  destination: ZoneCode;
  appliesTo: { passports: string[] | "ALL"; except?: string[] };
  kind: RequirementKind;
  name: Text;
  /** Только госдомен из data/official-domains.json — проверяется тестом. */
  officialUrl: string;
  /** amount: 0 — бесплатно. Нет поля — сбор зависит от гражданства или неизвестен. */
  fee?: { amount: number; currency: string };
  /** Окно подачи открывается за N часов до прилёта (72 для TDAC, e-Arrival Card Индии). */
  windowHoursBeforeArrival?: number;
  /**
   * Окно в календарных днях по времени страны, включая день прилёта.
   * 3 — подавать можно с 00:00 за два дня до даты прилёта (SG Arrival Card: прилёт 30.06 → с 28.06).
   */
  windowDaysBeforeArrival?: number;
  /** Рекомендуем подать не позже чем за N дней до прилёта (ETA, e-Visa). */
  recommendDaysBeforeArrival?: number;
  processing?: Text;
  stayLimitDays?: number;
  passportValidity?: Text;
  onwardTicketMayBeAsked?: boolean;
  notes?: Text;
  /** true — нужно и при пересадке без выхода из аэропорта. По умолчанию нет. */
  appliesToTransit?: boolean;
  /** Правило действует для прилётов в этот период (включительно), "YYYY-MM-DD". */
  validFrom?: string;
  validUntil?: string;
  /** Ссылка на первоисточник, по которому сверено правило. */
  source: string;
  /** Дата ручной проверки "YYYY-MM-DD". null — черновик, в продакшн-сборку не попадает. */
  verifiedAt: string | null;
  /** Что именно проверить человеку (для черновиков). */
  draftNote?: string;
};

/** Метаданные зоны назначения. */
export type Destination = {
  code: ZoneCode;
  name: Text;
  /** IANA-пояс для расчёта окон подачи. */
  timeZone: string;
  /** Официальный портал на случай, если по паре нет данных. */
  portalUrl: string;
  transit: {
    /** true — при пересадке без выхода из аэропорта въездные требования обычно не нужны. */
    airsideOk: boolean;
    note: Text;
  };
};

/** Точка маршрута, как её ввёл пользователь. */
export type TripStop = {
  /** ISO-код страны: "TH", "FR". */
  country: string;
  /** Дата прилёта "YYYY-MM-DD" по местному времени. */
  date: string;
  /** Время прилёта "HH:MM" по местному времени, если известно. */
  time?: string;
  /** Только пересадка, без выхода из аэропорта. */
  transit?: boolean;
};

export type Trip = {
  /** ISO-код гражданства. */
  passport: string;
  stops: TripStop[];
};

/** Цвет карточки: зелёный — ничего не нужно, жёлтый — форма или сбор, красный — разрешение. */
export type Status = "green" | "yellow" | "red" | "unknown";
