import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MINUTE } from "@/lib/time";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import { useTimerHotkeys } from "./useTimerHotkeys";

const store = () => useGluStore.getState();

function Harness() {
  useTimerHotkeys();
  return (
    <div>
      <p data-testid="prose">some selectable text</p>
      <input data-testid="field" />
      <div data-testid="editable" contentEditable suppressContentEditableWarning />
    </div>
  );
}

function press(
  key: string,
  init: KeyboardEventInit & { target?: Element } = {},
) {
  const { target, ...rest } = init;
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...rest,
  });
  (target ?? document.body).dispatchEvent(event);
  return event;
}

function selectSomething(el: Element) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-24T09:00:00.000Z").getTime());
  window.getSelection()?.removeAllRanges();
});

describe("keyboard control (ADR 06)", () => {
  it("`s` stops from running, paused and finished, and no-ops in idle", () => {
    render(<Harness />);

    store().start();
    press("s");
    expect(store().status).toBe("idle");

    store().start();
    store().pause();
    press("s");
    expect(store().status).toBe("idle");

    store().start();
    store().finish();
    press("s");
    expect(store().status).toBe("idle");

    // Already idle: nothing changes, nothing throws.
    press("s");
    expect(store().status).toBe("idle");
    expect(store().remaining).toBe(20 * MINUTE);
  });

  it("`p` toggles running ↔ paused and no-ops in idle and finished", () => {
    render(<Harness />);

    press("p");
    expect(store().status).toBe("idle");

    store().start();
    press("p");
    expect(store().status).toBe("paused");
    press("p");
    expect(store().status).toBe("running");

    store().finish();
    press("p");
    expect(store().status).toBe("finished");
  });

  it("`n` restarts at the selected duration and records no session", () => {
    const t0 = Date.now();
    render(<Harness />);

    store().setPreset(20 * MINUTE);
    store().start();
    const firstRunId = store().runId;
    vi.setSystemTime(t0 + 30_000);

    press("n");
    expect(store().status).toBe("running");
    expect(store().endAt).toBe(t0 + 30_000 + 20 * MINUTE);
    expect(store().runId).not.toBe(firstRunId);
    expect(store().day.sessions).toHaveLength(0);
  });

  it("`n` after a ± adjustment uses the selected duration, not the adjusted total", () => {
    const t0 = Date.now();
    render(<Harness />);

    store().setPreset(20 * MINUTE);
    store().start();
    store().adjust(5 * MINUTE);
    expect(store().total).toBe(25 * MINUTE);

    press("n");
    expect(store().total).toBe(20 * MINUTE);
    expect(store().endAt).toBe(t0 + 20 * MINUTE);
  });

  it("Ctrl+C stops when the selection is empty", () => {
    render(<Harness />);
    store().start();
    const event = press("c", { ctrlKey: true });
    expect(store().status).toBe("idle");
    expect(event.defaultPrevented).toBe(true);
  });

  it("Ctrl+C with an active selection leaves copy alone and the timer running", () => {
    const { getByTestId } = render(<Harness />);
    store().start();
    selectSomething(getByTestId("prose"));

    const event = press("c", { ctrlKey: true });
    expect(store().status).toBe("running");
    expect(event.defaultPrevented).toBe(false);
  });

  it("Ctrl+P and Ctrl+N reach the browser", () => {
    render(<Harness />);
    store().start();

    const p = press("p", { ctrlKey: true });
    const n = press("n", { ctrlKey: true });

    expect(store().status).toBe("running");
    expect(store().endAt).toBe(Date.now() + 20 * MINUTE);
    expect(p.defaultPrevented).toBe(false);
    expect(n.defaultPrevented).toBe(false);
  });

  it("ignores every binding while focus is in a text input", () => {
    const { getByTestId } = render(<Harness />);
    const field = getByTestId("field");
    store().start();

    for (const key of ["s", "p", "n"]) press(key, { target: field });
    expect(store().status).toBe("running");

    press("c", { ctrlKey: true, target: field });
    expect(store().status).toBe("running");
  });

  it("ignores every binding inside a contentEditable element", () => {
    const { getByTestId } = render(<Harness />);
    const editable = getByTestId("editable");
    // jsdom does not derive isContentEditable from the attribute.
    Object.defineProperty(editable, "isContentEditable", { value: true });
    store().start();

    for (const key of ["s", "p", "n"]) press(key, { target: editable });
    expect(store().status).toBe("running");

    press("c", { ctrlKey: true, target: editable });
    expect(store().status).toBe("running");
  });

  it("fires once for a held key (auto-repeat)", () => {
    render(<Harness />);
    store().setPreset(20 * MINUTE);
    store().start();
    const firstRunId = store().runId;

    press("n"); // the real keypress
    const afterFirst = store().runId;
    for (let i = 0; i < 20; i += 1) press("n", { repeat: true });

    expect(afterFirst).not.toBe(firstRunId);
    expect(store().runId).toBe(afterFirst);
  });
});
