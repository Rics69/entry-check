import { describe, expect, it } from "vitest";
import { parseEvent } from "./events";

describe("parseEvent", () => {
  it("принимает известное событие и чистит свойства", () => {
    const event = parseEvent({
      name: "check_result",
      locale: "ru",
      ref: "reddit",
      props: { passport: "RU", stops: 3, ok: true, nested: { x: 1 }, "bad key": "x", long: "x".repeat(100) },
    });
    expect(event).toEqual({
      name: "check_result",
      locale: "ru",
      ref: "reddit",
      props: JSON.stringify({ passport: "RU", stops: 3, ok: true, long: "x".repeat(64) }),
    });
  });

  it("отбрасывает неизвестные события и мусор", () => {
    expect(parseEvent({ name: "drop_table" })).toBeNull();
    expect(parseEvent(null)).toBeNull();
    expect(parseEvent("check_open")).toBeNull();
  });

  it("неизвестный язык → en, плохой ref → null, без свойств → null", () => {
    expect(parseEvent({ name: "share", locale: "de", ref: "<script>" })).toEqual({ name: "share", locale: "en", ref: null, props: null });
  });
});
