"use client";

import { useSyncExternalStore } from "react";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";

/** The scheme never changes outside React, so there is nothing to subscribe to. */
const subscribeToNothing = () => () => {};

/**
 * The resolved scheme plus a `mounted` flag.
 *
 * The server cannot know the resolved scheme, so anything that renders from it
 * (an icon, a label) must wait for the client — rendering it during hydration
 * is a hard error in React 19, not a warning. The gotcha moved here with ADR
 * 02's toggle when ADR 10 relocated it into the drawer.
 */
export function useResolvedScheme() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  return { isDark: computed === "dark", mounted, setColorScheme };
}
