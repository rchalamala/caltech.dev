/**
 * Shared color utility for deterministic course coloring.
 * Used by both the calendar (Planner) and workspace (WorkspaceEntry)
 * to visually link course cards to their calendar blocks.
 */

export function getCourseColor(courseId: number): { hue: number; sat: number } {
  const hue = ((courseId * 1.4269) % 1.0) * 360;
  const sat = (((courseId * 1.7234) % 0.2) + 0.5) * 100;
  return { hue, sat };
}

export function getCourseColorHSL(courseId: number, lightness = 70): string {
  const { hue, sat } = getCourseColor(courseId);
  return `hsl(${hue}, ${sat}%, ${lightness}%)`;
}
