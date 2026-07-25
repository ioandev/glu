"use client";

import { create } from "zustand";
import { apiFetch, apiUrl, onProxyUnauthorized } from "@/lib/api";

/**
 * `unknown` means the status fetch is still in flight. Consumers must not
 * render logged-in-only chrome during it — that flash is the whole reason the
 * three states are distinguished (ADR 19).
 */
export type AuthStatus = "unknown" | "out" | "in";

interface TodoistAuthState {
  status: AuthStatus;
  name: string | null;
  id: string | null;
  refresh: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
  /** Test/story seam. */
  setAuth: (next: Partial<Pick<TodoistAuthState, "status" | "name" | "id">>) => void;
}

/**
 * The single shared auth fact (ADR 19). Every Todoist surface — ADR 11's
 * button, the Settings section, ADR 12's list and tools, ADR 13's detail, ADR
 * 14's focused slot — observes this one store, so logging out is one state
 * transition seen everywhere at once.
 *
 * Deliberately **outside the persisted partition**: auth is server truth (the
 * sealed cookie), never localStorage's.
 */
export const useTodoistAuth = create<TodoistAuthState>()((set) => ({
  status: "unknown",
  name: null,
  id: null,

  refresh: async () => {
    try {
      const status = await apiFetch<{ authenticated: boolean; name?: string; id?: string }>(
        "/auth/todoist/status",
      );
      set(
        status.authenticated
          ? { status: "in", name: status.name ?? null, id: status.id ?? null }
          : { status: "out", name: null, id: null },
      );
    } catch {
      // No server, no Todoist app, an upstream hiccup — all of it renders as a
      // clean logged-out state, never an error screen (ADR 11).
      set({ status: "out", name: null, id: null });
    }
  },

  login: () => {
    // OAuth is a redirect dance, not an XHR — and this is a server route, so
    // the URL comes from the one API-base helper (ADR 01's no-hardcoded-URL
    // rule, ADR 11's flow).
    window.location.href = apiUrl("/auth/todoist/login");
  },

  logout: async () => {
    try {
      await apiFetch("/auth/todoist/logout", { method: "POST" });
    } catch {
      // Optimistic: proxy logout cannot meaningfully fail closed, and if the
      // POST errors the cookie dies at the next 401 anyway.
    }
    set({ status: "out", name: null, id: null });
  },

  setAuth: (next) => set(next),
}));

/**
 * One handler, once: **any proxy 401 flips the shared state to logged-out**.
 * Only 401 — an upstream Todoist failure relayed as 502 must not log anyone
 * out, which is exactly the distinction the proxy's status codes encode.
 */
onProxyUnauthorized(() => {
  const { status } = useTodoistAuth.getState();
  if (status === "out") return;
  useTodoistAuth.setState({ status: "out", name: null, id: null });
});

export function resetTodoistAuth() {
  useTodoistAuth.setState({ status: "unknown", name: null, id: null });
}
