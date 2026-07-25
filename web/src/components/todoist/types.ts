/** The shapes the proxy emits (ADR 12). The API's inverted priority scale never
 *  reaches this file — `uiPriority` is 1..4 in the UI's sense. */
export interface UiTask {
  id: string;
  title: string;
  description: string;
  uiPriority: 1 | 2 | 3 | 4;
  sectionId: string | null;
  order: number;
}

export interface NamedItem {
  id: string;
  name: string;
  query?: string;
}

export interface TodoistSection {
  id: string;
  name: string;
  order: number;
}

export type SourceType = "filter" | "label" | "project";

export interface TodoistSource {
  type: SourceType;
  id: string;
  name: string;
  /** Filters and labels are queried by text; projects by id. */
  query?: string;
}

export interface TaskListResponse {
  items: UiTask[];
  truncated: boolean;
  cap: number;
}

/** Todoist's own priority colours — theirs, not ours (ADR 12). */
export const PRIORITY_COLOR: Record<1 | 2 | 3 | 4, string> = {
  1: "#d1453b",
  2: "#eb8909",
  3: "#246fe0",
  4: "#8a8a8a",
};

/**
 * Project view: no-section tasks first, then each section in Todoist's own
 * `section_order`; within a group, Todoist's `child_order`. We never re-sort —
 * the user's Todoist arrangement is the arrangement.
 */
export interface TaskGroup {
  sectionId: string | null;
  name: string | null;
  tasks: UiTask[];
}

export function groupBySection(tasks: UiTask[], sections: TodoistSection[]): TaskGroup[] {
  const byOrder = [...sections].sort((a, b) => a.order - b.order);
  const bucket = (id: string | null) =>
    tasks.filter((t) => t.sectionId === id).sort((a, b) => a.order - b.order);

  const groups: TaskGroup[] = [];
  const loose = bucket(null);
  if (loose.length > 0) groups.push({ sectionId: null, name: null, tasks: loose });
  for (const section of byOrder) {
    const inSection = bucket(section.id);
    if (inSection.length > 0) {
      groups.push({ sectionId: section.id, name: section.name, tasks: inSection });
    }
  }
  return groups;
}
