import { describe, expect, it } from "vitest";
import {
  DEFAULT_TERM_PATH,
  getSupportedTermPaths,
  getTermPathFromDataFile,
  isSupportedTermPath,
  loadTermCourseData,
  resolveTermPath,
} from "./termData";

describe("term data helpers", () => {
  it("derives route paths from historical data filenames", () => {
    expect(
      getTermPathFromDataFile("../data/IndexedTotalFA2022-23.json"),
    ).toBe("/fa2023");
    expect(
      getTermPathFromDataFile("../data/IndexedTotalWI2025-26.json"),
    ).toBe("/wi2026");
    expect(getTermPathFromDataFile("../data/not-a-term.json")).toBeNull();
  });

  it("resolves the root path to the current term", () => {
    expect(resolveTermPath("/")).toBe(DEFAULT_TERM_PATH);
    expect(resolveTermPath("/FA2025")).toBe("/fa2025");
  });

  it("reports supported and unsupported term paths", () => {
    expect(getSupportedTermPaths()).toContain("/sp2026");
    expect(isSupportedTermPath("/sp2026")).toBe(true);
    expect(isSupportedTermPath("/unknown")).toBe(false);
  });

  it("loads course data for a valid term and rejects an invalid term", async () => {
    const courseIndex = await loadTermCourseData("/sp2026");

    expect(Object.keys(courseIndex).length).toBeGreaterThan(0);
    await expect(loadTermCourseData("/unknown")).rejects.toThrow(
      "unsupported term path",
    );
  });
});
