"use client";

import { AppShell } from "@/components/app/AppShell";
import { useHydrated } from "@/hooks/useHydrated";
import { useGluStore } from "@/store/gluStore";
import { EnterAppButton } from "./EnterAppButton";
import { WelcomeContent } from "./WelcomeContent";

/**
 * What `/glu` actually is (ADR 31): the welcome on a first visit, the app on
 * every visit after.
 *
 * **Pre-hydration this renders `null`, deliberately.** The flag lives in the
 * persisted blob, so before the mount effect there is no honest answer to
 * "has this person been here" — and guessing wrong in the returning-user
 * direction means a flash of a marketing page in front of the timer they opened
 * the tab to look at, on every single load. `AppShell` already gates its whole
 * interior on this same flag, so `/glu` painted an empty shell for that beat
 * regardless; the prose a crawler needs lives at `/glu/welcome`, which is a
 * real server-rendered route precisely so this branch does not have to be one.
 *
 * The welcome replaces the shell rather than covering it. Mounting `AppShell`
 * behind an overlay would start the wake lock, the alert hooks and the Todoist
 * status probe for someone who has not agreed to use GLU yet, and put a running
 * timer behind a page about running timers.
 */
export function WelcomeGate() {
  const hydrated = useHydrated();
  const hasEnteredApp = useGluStore((s) => s.hasEnteredApp);

  if (!hydrated) return null;
  if (hasEnteredApp) return <AppShell />;
  return <WelcomeContent action={<EnterAppButton />} />;
}
