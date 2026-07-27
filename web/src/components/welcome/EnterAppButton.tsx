"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useGluStore } from "@/store/gluStore";
import { useHydrated } from "@/hooks/useHydrated";
import { useTranslations } from "next-intl";
import classes from "./welcome.module.css";

/**
 * The one button that ends the welcome (ADR 31), shared by both frames.
 *
 * **It must not commit before the store has hydrated.** The persist middleware
 * runs with `skipHydration: true` (ADR 02): until the mount effect lands, the
 * store is holding *defaults*, and `persist` writes the whole partialized
 * object on every `set`. So an `enterApp()` at t=0 does not set a boolean — it
 * overwrites `glu:v2` with a blank app, taking the visitor's session archive,
 * clock choice and Todoist source with it. `useHydrated()` both waits for the
 * rehydrate and triggers it, which is why the guard is a real gate and not a
 * hopeful one.
 *
 * The closed window is sub-100 ms and sits below a page of prose, so no genuine
 * click lands in it. `aria-disabled` rather than `disabled`: the button keeps
 * its place in the tab order and its accessible name, and a click that arrives
 * early is a no-op the visitor can simply repeat.
 *
 * `navigateTo` is what makes the standalone route work, and it changes the
 * *element*, not just the behaviour. On `/glu` the gate is already mounted and
 * re-renders itself into the app, so there is nothing to navigate to and this
 * is a plain `<button>`. From `/glu/welcome` entering has to move — and a bare
 * link would bounce off the gate and land the reader back on the welcome, a
 * loop that only appears for someone who actually read the page before
 * entering. Hence a `next/link` whose click sets the flag on the way out; the
 * `localStorage` write is synchronous, so it is durable before the navigation
 * it precedes.
 */
export function EnterAppButton({ navigateTo }: { navigateTo?: string }) {
  const cta = useTranslations("welcome")("cta");
  const hydrated = useHydrated();
  const enterApp = useGluStore((s) => s.enterApp);

  const shared = {
    "aria-disabled": !hydrated,
    "data-testid": "enter-app",
    className: classes.cta,
  } as const;

  if (navigateTo) {
    return (
      <Link
        href={navigateTo}
        {...shared}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          // Navigating without the flag would land straight back here.
          if (!hydrated) {
            event.preventDefault();
            return;
          }
          enterApp();
        }}
      >
        {cta}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => hydrated && enterApp()} {...shared}>
      {cta}
    </button>
  );
}
