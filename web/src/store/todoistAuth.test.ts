import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTodoistAuth, useTodoistAuth } from "./todoistAuth";
import { apiFetch, ApiError } from "@/lib/api";

const auth = () => useTodoistAuth.getState();

function stubFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Response) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  resetTodoistAuth();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the shared auth substrate (ADR 19)", () => {
  it("starts `unknown` so consumers never flash logged-in chrome", () => {
    expect(auth().status).toBe("unknown");
  });

  it("resolves to `in` with the account identity", async () => {
    stubFetch(() => json({ authenticated: true, name: "Ioan", id: "42" }));
    await auth().refresh();
    expect(auth()).toMatchObject({ status: "in", name: "Ioan", id: "42" });
  });

  it("resolves to `out` when the proxy says so", async () => {
    stubFetch(() => json({ authenticated: false }));
    await auth().refresh();
    expect(auth()).toMatchObject({ status: "out", name: null, id: null });
  });

  it("resolves to `out` — never an error — when the proxy is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(auth().refresh()).resolves.toBeUndefined();
    expect(auth().status).toBe("out");
  });

  it("logs out optimistically even if the POST fails", async () => {
    useTodoistAuth.setState({ status: "in", name: "Ioan", id: "42" });
    stubFetch(() => json({ error: "boom" }, 500));
    await auth().logout();
    expect(auth()).toMatchObject({ status: "out", name: null, id: null });
  });

  it("calls the proxy logout endpoint", async () => {
    const spy = stubFetch(() => json({ authenticated: false }));
    useTodoistAuth.setState({ status: "in", name: "Ioan", id: "42" });
    await auth().logout();
    expect(String(spy.mock.calls[0][0])).toBe("/glu/api/auth/todoist/logout");
    expect(spy.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });
});

describe("the global 401 contract (ADR 19)", () => {
  it("flips every surface to logged out on a proxy 401", async () => {
    useTodoistAuth.setState({ status: "in", name: "Ioan", id: "42" });
    stubFetch(() => json({ error: "unauthenticated" }, 401));

    await expect(apiFetch("/todoist/tasks")).rejects.toBeInstanceOf(ApiError);
    expect(auth()).toMatchObject({ status: "out", name: null, id: null });
  });

  it("leaves auth alone for an upstream failure relayed as 502", async () => {
    useTodoistAuth.setState({ status: "in", name: "Ioan", id: "42" });
    stubFetch(() => json({ error: "upstream" }, 502));

    await expect(apiFetch("/todoist/tasks")).rejects.toBeInstanceOf(ApiError);
    expect(auth()).toMatchObject({ status: "in", name: "Ioan" });
  });

  it("leaves auth alone for a 404 or a 500", async () => {
    for (const status of [404, 500]) {
      useTodoistAuth.setState({ status: "in", name: "Ioan", id: "42" });
      stubFetch(() => json({ error: "nope" }, status));
      await expect(apiFetch("/todoist/tasks")).rejects.toBeInstanceOf(ApiError);
      expect(auth().status, `status ${status}`).toBe("in");
    }
  });
});
