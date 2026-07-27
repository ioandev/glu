import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlWrapper } from "@/test/intl";
import { MantineProvider } from "@mantine/core";
import { MINUTE } from "@/lib/time";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import { PresetRow } from "./PresetRow";

/**
 * ADR 32 — the custom rung: that it appears, where it sits, and that it is the
 * *selection* rather than a history. The store rules it renders are proved in
 * `gluStore.test.ts`; what is proved here is that the row shows them.
 */

const store = () => useGluStore.getState();

/** Mantine's `Button` needs a provider; the row is the first thing here to use one. */
const renderRow = () =>
  render(
    <IntlWrapper>
      <MantineProvider>
        <PresetRow />
      </MantineProvider>
    </IntlWrapper>,
  );

/** Labels in DOM order — the ladder's ordering is half of what this file asserts. */
const rungs = () =>
  screen
    .getAllByRole("button")
    .map((button) => button.textContent?.trim() ?? "");

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
});

describe("PresetRow (ADR 02/32)", () => {
  it("is the bare ladder while the selection is on it", () => {
    renderRow();
    expect(rungs()).toEqual(["5m", "10m", "15m", "20m", "30m", "45m", "60m"]);
    expect(screen.getByRole("button", { name: "20m" })).toHaveAttribute("aria-pressed", "true");
  });

  it("grows a pressed custom rung in sorted position", () => {
    useGluStore.setState({ selectedDuration: 3 * MINUTE });
    renderRow();
    expect(rungs()).toEqual(["3m", "5m", "10m", "15m", "20m", "30m", "45m", "60m"]);

    const custom = screen.getByRole("button", { name: "3m" });
    expect(custom).toHaveAttribute("aria-pressed", "true");
    expect(custom).toHaveAttribute("data-custom", "true");
  });

  it("sorts a mid-ladder custom into place, not onto the end", () => {
    useGluStore.setState({ selectedDuration: 23 * MINUTE });
    renderRow();
    expect(rungs()).toEqual(["5m", "10m", "15m", "20m", "23m", "30m", "45m", "60m"]);
  });

  it("shows one custom rung at a time — it is the selection, not a history", async () => {
    const user = userEvent.setup();
    useGluStore.setState({
      status: "idle",
      selectedDuration: 3 * MINUTE,
      total: 3 * MINUTE,
      remaining: 3 * MINUTE,
    });
    renderRow();

    act(() => store().adjust(4 * MINUTE));
    expect(rungs()).toEqual(["5m", "7m", "10m", "15m", "20m", "30m", "45m", "60m"]);

    // Back on the ladder, the rung has nothing left to say.
    await user.click(screen.getByRole("button", { name: "10m" }));
    expect(rungs()).toEqual(["5m", "10m", "15m", "20m", "30m", "45m", "60m"]);
  });

  it("re-selects the custom duration when tapped", async () => {
    const user = userEvent.setup();
    useGluStore.setState({
      status: "idle",
      selectedDuration: 3 * MINUTE,
      total: 20 * MINUTE,
      remaining: 20 * MINUTE,
    });
    renderRow();

    await user.click(screen.getByRole("button", { name: "3m" }));
    expect(store().remaining).toBe(3 * MINUTE);
    expect(store().total).toBe(3 * MINUTE);
  });
});
