export const LEGAL_DOCS = ["terms", "privacy", "refunds"] as const;
export type LegalDocId = (typeof LEGAL_DOCS)[number];

/** Документ из простых блоков. В тексте можно использовать {seller}, {email}, {site}. */
export type LegalDoc = {
  title: string;
  intro?: string;
  sections: { heading: string; paragraphs: string[] }[];
};

/** Дата текущей редакции документов. Меняйте при каждой правке текста. */
export const LEGAL_EDITION = "2026-11-09";
