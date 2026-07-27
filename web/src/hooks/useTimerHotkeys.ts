"use client";

import { useEffect } from "react";
import { useHotkeys } from "@mantine/hooks";
import { stopAlertSound } from "@/lib/alertSounds";
import { useGluStore } from "@/store/gluStore";

/**
 * ADR 06: `s` and `Ctrl+C` stop, `p` toggles pause, `n` abandons the current run
 * and starts a fresh one at the *selected* duration. Mounted once, at the app
 * shell.
 *
 * Mantine's `useHotkeys` already exact-matches modifiers (bare `s` will not fire
 * on Ctrl+S) and ignores editable targets; the guards worth writing ourselves
 * are auto-repeat and the Ctrl+C selection check.
 */
export function useTimerHotkeys() {
  const stop = useGluStore((s) => s.stop);
  const togglePause = useGluStore((s) => s.togglePause);
  const restart = useGluStore((s) => s.restart);

  useHotkeys(
    [
      ["s", (event) => guard(event, stop)],
      ["p", (event) => guard(event, togglePause)],
      ["n", (event) => guard(event, restart)],
    ],
    // Mantine's ignore list is tag names; contentEditable is covered by the
    // third argument defaulting to false (`triggerOnContentEditable`), which is
    // what the Todoist ADRs' text surfaces will inherit.
    ["INPUT", "TEXTAREA", "SELECT"],
    false,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && (event.key === "c" || event.key === "C"))) return;
      if (event.repeat) return;
      if (isEditable(event.target)) return;
      // With a selection, Ctrl+C stays the copy shortcut, untouched — the
      // terminal convention, and the only way to hijack it without breaking
      // copying. Letting the handler preventDefault unconditionally silently
      // kills copy.
      if ((window.getSelection()?.toString() ?? "") !== "") return;
      event.preventDefault();
      stopAlertSound();
      stop();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stop]);
}

function guard(event: KeyboardEvent | undefined, action: () => void) {
  // A held key must not machine-gun the action.
  if (event?.repeat) return;
  // ADR 40: a transport key is an acknowledgment, exactly like the button —
  // whichever surface the user reaches for, a sound in flight stops.
  stopAlertSound();
  action();
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    target.closest("[contenteditable='true']") !== null
  );
}
