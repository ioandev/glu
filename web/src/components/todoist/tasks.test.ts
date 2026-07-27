import { describe, expect, it } from "vitest";
import {
  groupBySection,
  labelSections,
  PRIORITY_COLOR,
  sectionRuns,
  type NamedItem,
  type TodoistSection,
  type TodoistSource,
  type UiTask,
} from "./types";

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
  projectId: null,
  sectionId,
  order,
  ...extra,
});

const sections: TodoistSection[] = [
  { id: "s2", name: "Later", order: 2 },
  { id: "s1", name: "Today", order: 1 },
  { id: "s3", name: "Someday", order: 3 },
];

const projects: NamedItem[] = [
  { id: "p1", name: "Work" },
  { id: "p2", name: "Personal" },
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

describe("filter/label section labelling (ADR 12 amendment 2026-07-26)", () => {
  it("never re-sorts — keeps fetched task order and labels each project/section run once", () => {
    const tasks = [
      task("a", "s1", 0, { projectId: "p1" }),
      task("b", "s1", 1, { projectId: "p1" }),
      task("c", null, 0, { projectId: "p1" }),
      task("d", "s2", 0, { projectId: "p2" }),
    ];
    const labeled = labelSections(tasks, sections, projects, "Filter");

    expect(labeled.map((l) => l.task.id)).toEqual(["a", "b", "c", "d"]);
    expect(labeled.map((l) => l.sectionLabel)).toEqual([
      "Work / Today",
      null,
      "Work",
      "Personal / Later",
    ]);
  });

  it("labels a no-section task by project alone, same as Todoist's own filter view", () => {
    // e.g. an Inbox task with no section — Todoist still shows an "Inbox"
    // header above it, it isn't exempt just because a project view leaves
    // its own no-section bucket unlabelled.
    const labeled = labelSections(
      [task("a", null, 0, { projectId: "p1" })],
      sections,
      projects,
      "Filter",
    );
    expect(labeled.map((l) => l.sectionLabel)).toEqual(["Work"]);
  });

  it("re-labels when a section run ends and the same section resumes later", () => {
    const tasks = [
      task("a", "s1", 0, { projectId: "p1" }),
      task("b", null, 0, { projectId: "p1" }),
      task("c", "s1", 0, { projectId: "p1" }),
    ];
    const labeled = labelSections(tasks, sections, projects, "Filter");
    expect(labeled.map((l) => l.sectionLabel)).toEqual(["Work / Today", "Work", "Work / Today"]);
  });

  it("degrades an unknown section to the project name alone, not to no header", () => {
    const labeled = labelSections(
      [task("a", "ghost", 0, { projectId: "p1" })],
      sections,
      projects,
      "Filter",
    );
    expect(labeled.map((l) => l.sectionLabel)).toEqual(["Work"]);
  });

  it("falls back to the source-type label when the project isn't in the fetched list", () => {
    const labeled = labelSections(
      [task("a", "s1", 0, { projectId: "ghost-project" })],
      sections,
      projects,
      "Label",
    );
    expect(labeled.map((l) => l.sectionLabel)).toEqual(["Label / Today"]);
  });

  it("still separates two different projects that both have no section", () => {
    const tasks = [
      task("a", null, 0, { projectId: "p1" }),
      task("b", null, 0, { projectId: "p2" }),
    ];
    const labeled = labelSections(tasks, sections, projects, "Filter");
    expect(labeled.map((l) => l.sectionLabel)).toEqual(["Work", "Personal"]);
  });
});

describe("sectionRuns (ADR 39)", () => {
  const projectSource: TodoistSource = { type: "project", id: "p1", name: "Work" };
  const filterSource: TodoistSource = { type: "filter", id: "f1", name: "Today" };

  it("turns a project into one run per group, loose bucket first and unheadered", () => {
    const tasks = [task("a", "s1", 1), task("b", null, 0), task("c", "s2", 0)];
    const runs = sectionRuns(projectSource, tasks, sections, []);
    expect(runs.map((r) => [r.header, r.tasks.map((t) => t.id)])).toEqual([
      [null, ["b"]],
      ["Today", ["a"]],
      ["Later", ["c"]],
    ]);
  });

  it("folds a filter's running headers back into runs, keeping fetch order", () => {
    const tasks = [
      task("a", "s1", 0, { projectId: "p1" }),
      task("b", "s1", 0, { projectId: "p1" }),
      task("c", null, 0, { projectId: "p2" }),
    ];
    const runs = sectionRuns(filterSource, tasks, sections, projects);
    expect(runs.map((r) => [r.header, r.tasks.map((t) => t.id)])).toEqual([
      ["Work / Today", ["a", "b"]],
      ["Personal", ["c"]],
    ]);
  });

  it("keys a repeated (project, section) pair distinctly, so two runs never collide", () => {
    const tasks = [
      task("a", "s1", 0, { projectId: "p1" }),
      task("b", null, 0, { projectId: "p2" }),
      task("c", "s1", 0, { projectId: "p1" }),
    ];
    const keys = sectionRuns(filterSource, tasks, sections, projects).map((r) => r.key);
    expect(new Set(keys).size).toBe(3);
  });

  it("keeps a run's key when its head task is completed away — an expanded run must not collapse", () => {
    const tasks = [
      task("a", "s1", 0, { projectId: "p1" }),
      task("b", "s1", 1, { projectId: "p1" }),
    ];
    const before = sectionRuns(filterSource, tasks, sections, projects);
    const after = sectionRuns(filterSource, tasks.slice(1), sections, projects);
    expect(after[0].key).toBe(before[0].key);
  });

  it("is empty for an empty list", () => {
    expect(sectionRuns(filterSource, [], sections, projects)).toEqual([]);
    expect(sectionRuns(projectSource, [], sections, [])).toEqual([]);
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
