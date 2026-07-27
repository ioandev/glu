import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { intlWrapper } from "@/test/intl";
import { MINUTE } from "@/lib/time";
import { initialPersistedState, resetGluStore, useGluStore } from "@/store/gluStore";
import { blobKey } from "@/store/storage";
import { useTodoistAuth } from "@/store/todoistAuth";
import { COMMENT_GRACE_MS } from "@/store/types";
import { useTimeComments } from "./useTimeComments";

const store = () => useGluStore.getState();

function freezeClock(at = new Date("2026-07-25T09:00:00.000Z").getTime()) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(at);
  return at;
}

let fetchMock: ReturnType<typeof vi.fn>;

/** The composed sentence never comes back to the client; only the id does. */
const posted = () =>
  new Response(JSON.stringify({ posted: true, content: "…", id: "c1" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

/** What the drain actually put on the wire. */
function postedBodies(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([, init]) => (init as RequestInit)?.method === "POST")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
  useTodoistAuth.setState({ status: "in", name: "Ioan", id: "42" });
  fetchMock = vi.fn(async () => posted());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useTodoistAuth.setState({ status: "unknown", name: null, id: null });
});

/** A focused task and a qualifying run — ADR 14's preconditions, once. */
function runAQualifyingRun(t0: number) {
  act(() => {
    store().setFocusedTask({ id: "t1", title: "Write the ADR", priority: 1 });
    store().start();
  });
  act(() => {
    vi.setSystemTime(t0 + 5 * MINUTE);
    store().stop();
  });
}

describe("the comment records the room the run happened in (ADR 27)", () => {
  it("is on by default — the owner's call, not a discovery", () => {
    expect(initialPersistedState().commentEnvironment).toBe(true);
  });

  it("snapshots the toggles that were on at run end", () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments(), { wrapper: intlWrapper });

    act(() => {
      store().toggleEnvironment("music");
      store().toggleEnvironment("headphones");
    });
    runAQualifyingRun(t0);

    expect(store().outbox[0].environment).toEqual(["music", "headphones"]);
  });

  it("records nothing when the setting is off, and turning it on later changes nothing", async () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments(), { wrapper: intlWrapper });

    act(() => {
      store().toggleEnvironment("music");
      store().setCommentEnvironment(false);
    });
    runAQualifyingRun(t0);
    expect(store().outbox[0].environment).toBeUndefined();

    // The snapshot is the point: flipping the setting on *after* the run ended
    // must not decorate a comment about a run it wasn't recorded for.
    act(() => {
      store().setCommentEnvironment(true);
      vi.setSystemTime(t0 + 5 * MINUTE + COMMENT_GRACE_MS + 1);
    });

    await waitFor(() => expect(postedBodies()).toHaveLength(1));
    // ADR 44: the wire carries a locale code beside the enumerated keys.
    expect(postedBodies()[0]).toEqual({ taskId: "t1", minutes: 5, locale: "en" });
  });

  it("moving rooms between the run and the retry does not rewrite history", async () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments(), { wrapper: intlWrapper });

    act(() => store().toggleEnvironment("music"));
    runAQualifyingRun(t0);

    // The outbox retries on a backoff; by the time it drains the user is
    // somewhere else entirely.
    act(() => {
      store().toggleEnvironment("silence");
      vi.setSystemTime(t0 + 5 * MINUTE + COMMENT_GRACE_MS + 1);
    });

    await waitFor(() => expect(postedBodies()).toHaveLength(1));
    expect(postedBodies()[0]).toEqual({
      taskId: "t1",
      minutes: 5,
      environment: ["music"],
      locale: "en",
    });
  });

  it("posts an entry persisted before this ADR undecorated, never from live state", async () => {
    const t0 = freezeClock();
    act(() => {
      store().toggleEnvironment("music");
      // An entry as ADR 14 wrote them: no environment field at all.
      store().enqueueComment({ runId: "r1", taskId: "t1", minutes: 5, postAfter: 0, attempts: 0 });
    });

    renderHook(() => useTimeComments(), { wrapper: intlWrapper });
    act(() => vi.setSystemTime(t0 + 1000));

    await waitFor(() => expect(postedBodies()).toHaveLength(1));
    // ADR 44: the wire carries a locale code beside the enumerated keys.
    expect(postedBodies()[0]).toEqual({ taskId: "t1", minutes: 5, locale: "en" });
  });
});

describe("the setting rides the additive-blob pattern (ADR 27)", () => {
  it("survives a reload", async () => {
    act(() => store().setCommentEnvironment(false));

    const blob = window.localStorage.getItem(blobKey(2));
    resetGluStore();
    window.localStorage.setItem(blobKey(2), blob!);
    await useGluStore.persist.rehydrate();

    expect(store().commentEnvironment).toBe(false);
  });

  it("reads as on in a blob written before it existed — no version bump needed", async () => {
    const legacy = { ...initialPersistedState() } as Record<string, unknown>;
    delete legacy.commentEnvironment;
    window.localStorage.setItem(blobKey(2), JSON.stringify({ state: legacy, version: 2 }));

    resetGluStore();
    await useGluStore.persist.rehydrate();

    expect(store().commentEnvironment).toBe(true);
    // Same blob key: this is a field, not a migration.
    expect(window.localStorage.getItem(blobKey(3))).toBeNull();
  });
});
