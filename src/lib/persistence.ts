import { createEmptyWorkspace } from "./scheduling";
import { Workspace } from "../types";

const NUM_WORKSPACES = 5;

export function loadWorkspaces(termPath: string): Workspace[] {
  const raw = localStorage.getItem("workspaces" + termPath);
  if (raw) {
    try {
      return JSON.parse(raw) as Workspace[];
    } catch {
      // corrupted — fall through to defaults
    }
  }
  return Array.from({ length: NUM_WORKSPACES }, () => createEmptyWorkspace());
}

export function saveWorkspaces(
  termPath: string,
  workspaces: Workspace[],
): void {
  localStorage.setItem("workspaces" + termPath, JSON.stringify(workspaces));
}

export function loadWorkspaceIdx(termPath: string): number {
  const raw = localStorage.getItem("workspaceIdx" + termPath);
  if (raw) {
    try {
      return JSON.parse(raw) as number;
    } catch {
      // corrupted — fall through to default
    }
  }
  return 0;
}

export function saveWorkspaceIdx(termPath: string, idx: number): void {
  localStorage.setItem("workspaceIdx" + termPath, JSON.stringify(idx));
}
