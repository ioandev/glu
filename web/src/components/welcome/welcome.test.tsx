import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initialPersistedState, resetGluStore, useGluStore } from "@/store/gluStore";
import { blobKey, CURRENT_BLOB_VERSION } from "@/store/storage";
import { WELCOME_CTA, WELCOME_HEADLINE } from "./WelcomeSections";
import { WelcomeGate } from "./WelcomeGate";

/**
 * ADR 31 — the gate's branching, and only that.
 *
 * `AppShell` is mocked to a marker: it is ADR 02's entire app, it starts a wake
 * lock, an alert hook and a Todoist probe on mount, and none of that is what
 * this file is about. What matters here is *which* of the two things `/glu`
 * renders, and that the pre-hydration branch renders neither.
 *
 * `useHydrated` is mocked for the same reason — it is the SSR/first-paint fact,
 * and under Testing Library the mount effect has always already run by the time
 * `render()` returns, so the real hook can never be observed in its `false`
 * state. The genuine article is covered end to end in `e2e/welcome.spec.ts`.
 */
vi.mock("@/components/app/AppShell", () => ({
  AppShell: () => <div data-testid="app-shell" />,
}));

let hydrated = true;
vi.mock("@/hooks/useHydrated", () => ({
  useHydrated: () => hydrated,
}));

const store = () => useGluStore.getState();

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
  hydrated = true;
});

describe("welcome gate (ADR 31)", () => {
  it("renders nothing before the store has hydrated", () => {
    hydrated = false;
    const { container } = render(<WelcomeGate />);

    // Not the welcome, and — the point of the branch — not a frame of it in
    // front of the app for someone who has been here a hundred times.
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the welcome, and no app, on a first visit", () => {
    render(<WelcomeGate />);

    expect(screen.getByRole("heading", { level: 1, name: WELCOME_HEADLINE })).toBeVisible();
    expect(screen.getByRole("button", { name: WELCOME_CTA })).toBeVisible();
    expect(screen.queryByTestId("app-shell")).toBeNull();
  });

  it("shows the app, and no welcome, once entered", () => {
    act(() => store().enterApp());
    render(<WelcomeGate />);

    expect(screen.getByTestId("app-shell")).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1, name: WELCOME_HEADLINE })).toBeNull();
  });

  it("the call to action swaps the welcome for the app, in place", async () => {
    const user = userEvent.setup();
    render(<WelcomeGate />);

    await user.click(screen.getByRole("button", { name: WELCOME_CTA }));

    expect(screen.getByTestId("app-shell")).toBeVisible();
    expect(store().hasEnteredApp).toBe(true);
    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(JSON.parse(raw!).state).toMatchObject({ hasEnteredApp: true });
  });

  /**
   * The dangerous one. `persist` writes the whole partialized object on every
   * `set`, so a CTA that fires before hydration does not set a boolean — it
   * replaces a real user's blob with the store's defaults.
   */
  it("a click before hydration writes nothing at all", async () => {
    const populated = {
      ...initialPersistedState(),
      hasEnteredApp: false,
      activeClockId: "radar",
      archive: [{ startedAt: 1, sessions: [] }],
    };
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({ version: CURRENT_BLOB_VERSION, state: populated }),
    );

    hydrated = false;
    const user = userEvent.setup();
    // Rendered directly: the gate itself shows nothing in this state, and the
    // button is what is being tested.
    const { EnterAppButton } = await import("./EnterAppButton");
    render(<EnterAppButton />);

    await user.click(screen.getByRole("button", { name: WELCOME_CTA }));

    expect(store().hasEnteredApp).toBe(false);
    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(JSON.parse(raw!).state).toMatchObject({
      activeClockId: "radar",
      archive: [{ startedAt: 1, sessions: [] }],
    });
  });

  it("the navigating variant is a link, so entering from /glu/welcome moves", async () => {
    const { EnterAppButton } = await import("./EnterAppButton");
    render(<EnterAppButton navigateTo="/" />);

    const cta = screen.getByRole("link", { name: WELCOME_CTA });
    // The route-relative href. `next/link` is what turns this into `/glu/…`,
    // and it does so through the Next runtime — absent here, so the basePath
    // is asserted where it is real, in `e2e/welcome.spec.ts`.
    expect(cta).toHaveAttribute("href", "/");

    await userEvent.setup().click(cta);
    expect(store().hasEnteredApp).toBe(true);
  });
});
