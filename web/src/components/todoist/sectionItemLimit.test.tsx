import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { IntlWrapper } from "@/test/intl";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { initialPersistedState, resetGluStore, useGluStore } from "@/store/gluStore";
import { blobKey, CURRENT_BLOB_VERSION } from "@/store/storage";
import {
  DEFAULT_SECTION_ITEM_LIMIT,
  resolveSectionItemLimit,
  SECTION_ITEM_LIMIT_ALL,
} from "@/store/types";
import { TaskList } from "./TaskList";
import type { TodoistSection, TodoistSource, UiTask } from "./types";
import type { TodoistListState } from "./useTodoistList";

/**
 * ADR 39. Three separable claims: the resolver never lets a junk blob invent a
 * ceiling, the store carries the field additively, and the list caps *runs* —
 * after its own exclusions, in both views, with the overflow line as the way
 * back.
 */

const store = () => useGluStore.getState();

const task = (id: string, sectionId: string | null = null, projectId: string | null = null): UiTask => ({
  id,
  title: `Task ${id}`,
  description: "",
  uiPriority: 4,
  projectId,
  sectionId,
  order: Number(id),
});

/** `n` tasks in one section, ids 1..n. */
const many = (n: number, sectionId: string | null = null, projectId: string | null = null) =>
  Array.from({ length: n }, (_, i) => task(String(i + 1), sectionId, projectId));

const sections: TodoistSection[] = [
  { id: "s1", name: "Today", order: 1 },
  { id: "s2", name: "Later", order: 2 },
];

const project: TodoistSource = { type: "project", id: "p1", name: "Work" };
const filter: TodoistSource = { type: "filter", id: "f1", name: "Everything" };

const list = (patch: Partial<TodoistListState> = {}): TodoistListState => ({
  phase: "ready",
  tasks: [],
  sections,
  projects: [{ id: "p1", name: "Work" }],
  truncated: false,
  cap: 200,
  errorMessage: null,
  gone: false,
  refreshing: false,
  reload: () => {},
  ...patch,
});

const renderList = (props: Parameters<typeof TaskList>[0]) =>
  render(
    <IntlWrapper>
      <MantineProvider>
        <TaskList {...props} />
      </MantineProvider>
    </IntlWrapper>,
  );

/** The cards actually painted — the only count that matters here. */
const cards = () => screen.queryAllByTestId("task-card");

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
});

describe("resolveSectionItemLimit (ADR 39)", () => {
  it("passes every rung through, All included", () => {
    for (const value of [10, 20, 50, 100, SECTION_ITEM_LIMIT_ALL]) {
      expect(resolveSectionItemLimit(value)).toBe(value);
    }
  });

  it("reads anything off the ladder as the default, which is All", () => {
    expect(DEFAULT_SECTION_ITEM_LIMIT).toBe(SECTION_ITEM_LIMIT_ALL);
    for (const junk of [3, 999, -1, NaN, null, undefined, "10", {}]) {
      expect(resolveSectionItemLimit(junk)).toBe(SECTION_ITEM_LIMIT_ALL);
    }
  });
});

describe("the stored limit (ADR 39)", () => {
  it("defaults to All and refuses to store an off-ladder value", () => {
    expect(store().sectionItemLimit).toBe(SECTION_ITEM_LIMIT_ALL);
    act(() => store().setSectionItemLimit(20));
    expect(store().sectionItemLimit).toBe(20);
    act(() => store().setSectionItemLimit(3));
    expect(store().sectionItemLimit).toBe(SECTION_ITEM_LIMIT_ALL);
  });

  it("is additive: it lands in the current blob, no version bump", () => {
    act(() => store().setSectionItemLimit(50));
    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(raw).not.toBeNull();
    const blob = JSON.parse(raw!);
    expect(blob.version).toBe(CURRENT_BLOB_VERSION);
    expect(blob.state.sectionItemLimit).toBe(50);
  });

  it("reads a blob written before the field existed as All", () => {
    const older: Record<string, unknown> = { ...initialPersistedState() };
    delete older.sectionItemLimit;
    expect(resolveSectionItemLimit(older.sectionItemLimit)).toBe(SECTION_ITEM_LIMIT_ALL);
  });
});

describe("TaskList section ceiling (ADR 39)", () => {
  it("renders every task when the limit is All", () => {
    renderList({ source: project, list: list({ tasks: many(25, "s1") }) });
    expect(cards()).toHaveLength(25);
    expect(screen.queryByText(/more$/)).toBeNull();
  });

  it("caps a project section and offers the rest behind +N more", () => {
    act(() => store().setSectionItemLimit(10));
    renderList({ source: project, list: list({ tasks: many(25, "s1") }) });
    expect(cards()).toHaveLength(10);
    expect(screen.getByText("+15 more")).toBeInTheDocument();
  });

  it("caps a filter run the same way", () => {
    act(() => store().setSectionItemLimit(10));
    renderList({ source: filter, list: list({ tasks: many(25, "s1", "p1") }) });
    expect(cards()).toHaveLength(10);
    expect(screen.getByText("+15 more")).toBeInTheDocument();
  });

  it("caps each run independently", () => {
    act(() => store().setSectionItemLimit(10));
    renderList({
      source: project,
      list: list({ tasks: [...many(12, "s1"), ...many(11, "s2").map((t) => ({ ...t, id: `x${t.id}` }))] }),
    });
    expect(screen.getByText("+2 more")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
    expect(cards()).toHaveLength(20);
  });

  it("reveals exactly the hidden tasks on tap, and drops the line", async () => {
    act(() => store().setSectionItemLimit(10));
    renderList({ source: project, list: list({ tasks: many(12, "s1") }) });
    await userEvent.click(screen.getByText("+2 more"));
    expect(cards()).toHaveLength(12);
    expect(screen.queryByText(/more$/)).toBeNull();
  });

  it("caps after the list's own exclusions, so completing one promotes a hidden task", () => {
    act(() => store().setSectionItemLimit(10));
    const tasks = many(11, "s1");
    const view = renderList({ source: project, list: list({ tasks }) });
    expect(screen.getByText("+1 more")).toBeInTheDocument();
    view.rerender(
      <IntlWrapper>
        <MantineProvider>
          <TaskList source={project} list={list({ tasks })} completingIds={new Set(["1"])} />
        </MantineProvider>
      </IntlWrapper>,
    );
    expect(cards()).toHaveLength(10);
    expect(screen.queryByText(/more$/)).toBeNull();
  });

  it("never hides the focused task — it is excluded before the run is capped", () => {
    act(() => store().setSectionItemLimit(10));
    renderList({ source: project, list: list({ tasks: many(11, "s1") }), excludeId: "11" });
    expect(cards()).toHaveLength(10);
    expect(screen.queryByText(/more$/)).toBeNull();
  });

  it("caps a project's headerless loose bucket too", () => {
    act(() => store().setSectionItemLimit(10));
    renderList({ source: project, list: list({ tasks: many(14, null) }) });
    expect(screen.getByText("+4 more")).toBeInTheDocument();
  });
});
