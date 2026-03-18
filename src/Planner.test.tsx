import { describe, expect, it, vi } from "vitest";
import { parseTimes } from "./Planner";

describe("parseTimes", () => {
  it("parses weekday course meetings into per-day intervals", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const parsed = parseTimes("MWF 09:00 - 09:55");

    expect(parsed[0]).toHaveLength(1);
    expect(parsed[2]).toHaveLength(1);
    expect(parsed[4]).toHaveLength(1);
    expect(parsed[1]).toHaveLength(0);
    expect(parsed[3]).toHaveLength(0);

    logSpy.mockRestore();
  });
});
