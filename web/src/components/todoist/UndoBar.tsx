"use client";

import { useEffect, useState } from "react";
import { Transition, UnstyledButton } from "@mantine/core";
import classes from "./todoist.module.css";

export interface UndoMessage {
  /** Identity of the thing being offered for undo — changes reset the timer. */
  key: string;
  /** Leading monospace badge, e.g. `[5m]`. Optional. */
  badge?: string;
  text: string;
  /** Epoch ms the affordance lapses. */
  until: number;
  error?: string;
  onUndo: () => void;
}

/**
 * The shared undo host (ADR 14, generalised by ADR 20): one bar, one message at
 * a time, newest wins.
 *
 * ADR 14's comments have no inverse short of a delete verb, so their undo is a
 * *cancellation* inside a grace window; ADR 20's completions have `reopen`, so
 * theirs is a real call after the fact. Same bar, different mechanics — and
 * still not `@mantine/notifications`: one host with two message types is not a
 * notification system (ADR 18's standing rule, untouched).
 */
export function UndoBar({ message }: { message: UndoMessage | null }) {
  const [expiredKey, setExpiredKey] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const remaining = Math.max(0, message.until - Date.now());
    const timer = setTimeout(() => setExpiredKey(message.key), remaining);
    return () => clearTimeout(timer);
  }, [message]);

  const visible = Boolean(message) && expiredKey !== message?.key;

  // The bar floats over the bottom of the page, so the page makes room for it
  // while it is up: it must never cover the transport controls or the
  // environment toggles, even at 590px (ADR 14).
  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.setAttribute("data-glu-undo-bar", "");
    else root.removeAttribute("data-glu-undo-bar");
    return () => root.removeAttribute("data-glu-undo-bar");
  }, [visible]);

  return (
    <Transition mounted={visible} transition="slide-up" duration={140}>
      {(style) => (
        <div className={classes.undoBar} style={style} data-testid="undo-bar" role="status">
          {message?.badge ? <span className={classes.undoBadge}>{message.badge}</span> : null}
          <span className={classes.undoText}>{message?.error ?? message?.text}</span>
          <UnstyledButton className={classes.undoButton} onClick={() => message?.onUndo()}>
            Undo
          </UnstyledButton>
        </div>
      )}
    </Transition>
  );
}
