"use client";

import { Stack } from "@mantine/core";
import { AdjustRow } from "@/components/timer/AdjustRow";
import { SessionStrip } from "@/components/timer/SessionStrip";
import { TransportControls } from "@/components/timer/TransportControls";

/**
 * Everything in the timer half except the clock itself — ADR 08 gives the clock
 * its own slot so it can own the first viewport below `sm`.
 */
export function TimerPanel() {
  return (
    <Stack gap="lg" align="center" justify="center" w="100%" maw={560}>
      <TransportControls />
      <AdjustRow />
      <SessionStrip />
    </Stack>
  );
}
