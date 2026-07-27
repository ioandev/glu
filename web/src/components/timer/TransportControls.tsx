"use client";

import { Button, Group, Tooltip } from "@mantine/core";
import { useTranslations } from "next-intl";
import { primeAudio, stopAlertSound } from "@/lib/alertSounds";
import { requestAlertPermission } from "@/hooks/useSessionAlerts";
import { useGluStore } from "@/store/gluStore";
import classes from "./timer.module.css";

/**
 * Start·Pause / Stop — the biggest touch targets on the page (ADR 02, as
 * amended by ADR 37: one primary button that names the next transition rather
 * than a Start and a Pause taking turns being dead).
 * Shortcut affordances (`p`, `s`) come from ADR 06.
 */
export function TransportControls() {
  const status = useGluStore((s) => s.status);
  const start = useGluStore((s) => s.start);
  const pause = useGluStore((s) => s.pause);
  const stop = useGluStore((s) => s.stop);
  const t = useTranslations("timer");

  const running = status === "running";
  const primaryLabel = running ? t("pause") : status === "paused" ? t("resume") : t("start");
  // The shortcut hint is its own message per state — the key stays Latin, the
  // word in front of the dash does not.
  const primaryHint = running
    ? t("pauseHint", { key: "P" })
    : status === "paused"
      ? t("resumeHint", { key: "P" })
      : t("startHint", { key: "P" });

  /**
   * ADR 18: the alert sound's AudioContext is created and resumed inside this
   * handler's synchronous span — the gesture browsers require, at the only
   * moment that guarantees one. The permission ask rides along and is never
   * awaited: the timer starts now, the prompt resolves whenever it resolves.
   * Pausing is not a start gesture, so it primes nothing.
   */
  const handlePrimary = () => {
    // ADR 40: touching the transport *is* the acknowledgment. An alert that
    // can run for twenty seconds must not keep sounding after the user has
    // walked back and pressed something.
    stopAlertSound();
    if (running) {
      pause();
      return;
    }
    primeAudio();
    requestAlertPermission();
    start();
  };

  return (
    <Group gap="sm" justify="center">
      {/* `p` is a no-op in idle and finished (ADR 06), so the button only
          advertises the shortcut in the two states where it does something. */}
      <Tooltip label={primaryHint} disabled={status === "idle" || status === "finished"}>
        <Button
          className={`${classes.transportButton} ${classes.transportPrimary}`}
          size="xl"
          data-variant="filled"
          onClick={handlePrimary}
          aria-keyshortcuts={running || status === "paused" ? "p" : undefined}
        >
          {primaryLabel}
        </Button>
      </Tooltip>
      <Tooltip label={t("stopHint", { key: "S" })}>
        <Button
          className={classes.transportButton}
          size="xl"
          variant="default"
          data-variant="default"
          onClick={() => {
            stopAlertSound();
            stop();
          }}
          aria-keyshortcuts="s Control+C"
        >
          {t("stop")}
        </Button>
      </Tooltip>
    </Group>
  );
}
