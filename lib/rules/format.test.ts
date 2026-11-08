import { describe, expect, it } from "vitest";
import { ALL_RULES } from "@/data/requirements";
import { formatRulesJson } from "./format";

describe("formatRulesJson", () => {
  it("не теряет и не меняет данные", () => {
    expect(JSON.parse(formatRulesJson(ALL_RULES))).toEqual(ALL_RULES);
  });

  it("повторное форматирование ничего не меняет", () => {
    const once = formatRulesJson(ALL_RULES);
    expect(formatRulesJson(JSON.parse(once))).toBe(once);
  });

  it("короткие объекты — в одну строку, каждое правило — с новой строки", () => {
    const text = formatRulesJson([{ id: "x", appliesTo: { passports: ["RU", "KZ"] }, verifiedAt: null }]);
    expect(text).toBe(
      '[\n  {\n    "id": "x",\n    "appliesTo": { "passports": ["RU", "KZ"] },\n    "verifiedAt": null\n  }\n]\n',
    );
  });
});
