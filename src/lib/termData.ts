import { CourseIndex } from "../types";

const TERM_PREFIX_MAP = {
  FA: "fa",
  SP: "sp",
  WI: "wi",
} as const;

const termDataModules = import.meta.glob<{ default: CourseIndex }>(
  "../data/IndexedTotal*.json",
);

export const DEFAULT_TERM_PATH = "/sp2026";

export function getTermPathFromDataFile(
  dataFilePath: string,
): string | null {
  const match = dataFilePath.match(/IndexedTotal(FA|SP|WI)\d{4}-(\d{2})\.json$/);
  if (!match) {
    return null;
  }

  const termPrefix = TERM_PREFIX_MAP[match[1] as keyof typeof TERM_PREFIX_MAP];
  const calendarYear = 2000 + parseInt(match[2], 10);
  return `/${termPrefix}${calendarYear}`;
}

const termDataLoaders = Object.fromEntries(
  Object.entries(termDataModules).flatMap(([dataFilePath, loadData]) => {
    const termPath = getTermPathFromDataFile(dataFilePath);
    return termPath ? [[termPath, loadData]] : [];
  }),
) as Record<string, () => Promise<{ default: CourseIndex }>>;

export function getSupportedTermPaths(): string[] {
  return Object.keys(termDataLoaders).sort();
}

export function resolveTermPath(pathname: string): string {
  return pathname === "/" ? DEFAULT_TERM_PATH : pathname.toLowerCase();
}

export function isSupportedTermPath(pathname: string): boolean {
  return resolveTermPath(pathname) in termDataLoaders;
}

export async function loadTermCourseData(pathname: string): Promise<CourseIndex> {
  const termPath = resolveTermPath(pathname);
  const loadData = termDataLoaders[termPath];

  if (!loadData) {
    throw new Error(`unsupported term path: ${termPath}`);
  }

  const module = await loadData();
  return module.default;
}
