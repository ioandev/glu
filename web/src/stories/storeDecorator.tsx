import React from "react";
import type { Decorator } from "@storybook/nextjs-vite";
import { initialPersistedState, useGluStore, type GluPersistedState } from "@/store/gluStore";

/**
 * Stories drive the store directly rather than waiting on wall-clock time — a
 * play function must never sleep for real seconds (ADR 03).
 */
export function withStoreState(patch: Partial<GluPersistedState> = {}): Decorator {
  return function StoreDecorator(Story) {
    // Runs during render, before the story's children read the store.
    React.useState(() => {
      useGluStore.setState({ ...initialPersistedState(), ...patch });
      return true;
    });
    return <Story />;
  };
}
