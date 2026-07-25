import { describe, expect, it } from "vitest";
import { groupBySection, PRIORITY_COLOR, type TodoistSection, type UiTask } from "./types";

const task = (
  id: string,
  sectionId: string | null,
  order: number,
  extra: Partial<UiTask> = {},
): UiTask => ({
  id,
  title: `Task ${id}`,
  description: "",
  uiPriority: 4,
  sectionId,
  order,
  ...extra,
});

const sections: TodoistSection[] = [
  { id: "s2", name: "Later", order: 2 },
  { id: "s1", name: "Today", order: 1 },
  { id: "s3", name: "Someday", order: 3 },
];

describe("project grouping (ADR 12)", () => {
  it("puts no-section tasks first, then sections in Todoist's order", () => {
    const tasks = [
      task("d", "s3", 0),
      task("b", "s1", 1),
      task("a", null, 0),
      task("c", "s2", 0),
    ];
    const groups = groupBySection(tasks, sections);

    expect(groups.map((g) => g.name)).toEqual([null, "Today", "Later", "Someday"]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["a"]);
    expect(groups[1].tasks.map((t) => t.id)).toEqual(["b"]);
  });

  it("keeps Todoist's child order within a group and never re-sorts by title", () => {
    const tasks = [task("z", null, 0), task("a", null, 1)];
    expect(groupBySection(tasks, []).at(0)!.tasks.map((t) => t.id)).toEqual(["z", "a"]);
  });

  it("omits empty sections entirely", () => {
    const groups = groupBySection([task("a", "s1", 0)], sections);
    expect(groups.map((g) => g.name)).toEqual(["Today"]);
  });

  it("handles a task in an unknown section without losing it silently", () => {
    const groups = groupBySection([task("a", "ghost", 0), task("b", null, 0)], sections);
    // The loose bucket still renders; the orphan simply has no header to sit
    // under, which is visible rather than a crash.
    expect(groups.map((g) => g.name)).toEqual([null]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("priority colours (ADR 12)", () => {
  it("uses Todoist's own values, P1 through P4", () => {
    expect(PRIORITY_COLOR).toEqual({
      1: "#d1453b",
      2: "#eb8909",
      3: "#246fe0",
      4: "#8a8a8a",
    });
  });
});
