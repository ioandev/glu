"use client";

import { Button, Group, Tooltip } from "@mantine/core";
import { primeAudio } from "@/lib/chime";
import { requestAlertPermission } from "@/hooks/useSessionAlerts";
import { useGluStore } from "@/store/gluStore";
import classes from "./timer.module.css";

/**
 * Start / Pause / Stop — the biggest touch targets on the page (ADR 02).
 * Shortcut affordances (`p`, `s`) come from ADR 06.
 */
export function TransportControls() {
  const status = useGluStore((s) => s.status);
  const start = useGluStore((s) => s.start);
  const pause = useGluStore((s) => s.pause);
  const stop = useGluStore((s) => s.stop);

  const running = status === "running";

  /**
   * ADR 18: the chime's AudioContext is created and resumed inside this
   * handler's synchronous span — the gesture browsers require, at the only
   * moment that guarantees one. The permission ask rides along and is never
   * awaited: the timer starts now, the prompt resolves whenever it resolves.
   */
  const handleStart = () => {
    primeAudio();
    requestAlertPermission();
    start();
  };

  return (
    <Group gap="sm" justify="center">
      <Button
        className={classes.transportButton}
        size="xl"
        data-variant="filled"
        onClick={handleStart}
        disabled={running}
      >
        {status === "paused" ? "Resume" : "Start"}
      </Button>
      <Tooltip label="Pause — P">
        <Button
          className={classes.transportButton}
          size="xl"
          variant="default"
          data-variant="default"
          onClick={pause}
          disabled={!running}
          aria-keyshortcuts="p"
        >
          Pause
        </Button>
      </Tooltip>
      <Tooltip label="Stop — S">
        <Button
          className={classes.transportButton}
          size="xl"
          variant="default"
          data-variant="default"
          onClick={stop}
          aria-keyshortcuts="s Control+C"
        >
          Stop
        </Button>
      </Tooltip>
    </Group>
  );
}
