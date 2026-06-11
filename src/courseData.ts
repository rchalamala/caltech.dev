export const CURRENT_TERM = "/fa2027";

const courseDataLoaders: {
  [key: string]: () => Promise<{ default: CourseIndex }>;
} = {
  "/fa2023": () => import("./data/IndexedTotalFA2022-23.json"),
  "/wi2023": () => import("./data/IndexedTotalWI2022-23.json"),
  "/sp2023": () => import("./data/IndexedTotalSP2022-23.json"),
  "/fa2024": () => import("./data/IndexedTotalFA2023-24.json"),
  "/wi2024": () => import("./data/IndexedTotalWI2023-24.json"),
  "/sp2024": () => import("./data/IndexedTotalSP2023-24.json"),
  "/fa2025": () => import("./data/IndexedTotalFA2024-25.json"),
  "/wi2025": () => import("./data/IndexedTotalWI2024-25.json"),
  "/sp2025": () => import("./data/IndexedTotalSP2024-25.json"),
  "/fa2026": () => import("./data/IndexedTotalFA2025-26.json"),
  "/wi2026": () => import("./data/IndexedTotalWI2025-26.json"),
  "/sp2026": () => import("./data/IndexedTotalSP2025-26.json"),
  "/fa2027": () => import("./data/IndexedTotalFA2026-27.json"),
};

const courseIndexCache: { [key: string]: CourseIndex } = {};

export function getCachedCourseIndex(term: string): CourseIndex | undefined {
  return courseIndexCache[term];
}

export async function loadCourseIndex(term: string): Promise<CourseIndex> {
  const cached = courseIndexCache[term];
  if (cached) {
    return cached;
  }
  const loader = courseDataLoaders[term];
  if (!loader) {
    return {};
  }
  const module = await loader();
  courseIndexCache[term] = module.default;
  return module.default;
}
