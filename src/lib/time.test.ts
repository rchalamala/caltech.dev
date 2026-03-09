import { describe, expect, it } from "vitest";
import { parseTimes } from "./time";

describe("parseTimes", () => {
  it("parses recurring weekday intervals", () => {
    const parsedTimes = parseTimes("MWF 09:00 - 09:55");

    expect(parsedTimes[0]).toHaveLength(1);
    expect(parsedTimes[2]).toHaveLength(1);
    expect(parsedTimes[4]).toHaveLength(1);
    expect(parsedTimes[1]).toHaveLength(0);

    expect(parsedTimes[0][0]?.start.getHours()).toBe(9);
    expect(parsedTimes[0][0]?.end.getMinutes()).toBe(55);
  });

  it("handles multiline, comma-separated, and TBA entries", () => {
    const parsedTimes = parseTimes("TR 10:00 - 11:25,\nF 13:00 - 13:55\nA");

    expect(parsedTimes[1]).toHaveLength(1);
    expect(parsedTimes[3]).toHaveLength(1);
    expect(parsedTimes[4]).toHaveLength(1);
    expect(parsedTimes[1][0]?.start.getHours()).toBe(10);
    expect(parsedTimes[4][0]?.end.getHours()).toBe(13);
  });
});
