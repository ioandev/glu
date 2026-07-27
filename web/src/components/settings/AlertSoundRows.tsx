"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SegmentedControl, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  ALERT_DURATION_CHOICES,
  ALERT_DURATION_ONCE,
  ALERT_SOUNDS,
  alertPlaybackSeconds,
  playAlertSound,
  primeAudio,
  resolveAlertDurationSeconds,
  resolveAlertSound,
  stopAlertSound,
} from "@/lib/alertSounds";
import { useGluStore } from "@/store/gluStore";
import classes from "./settings.module.css";

/**
 * A sound's id is persisted and never translated (ADR 40); the label is only
 * the button's face, so it is looked up here rather than read off
 * `ALERT_SOUNDS`. An id with no catalog key falls back to the module's own
 * English label instead of rendering nothing.
 */
const SOUND_KEY = {
  chime: "soundChime",
  bell: "soundBell",
  wood: "soundWood",
  rise: "soundRise",
  settle: "soundSettle",
  pulse: "soundPulse",
  digital: "soundDigital",
  glass: "soundGlass",
  deep: "soundDeep",
  // `as const`, not `satisfies Record<string, string>`: the values have to stay
  // *literal* to be accepted as message keys — widened to `string` they are no
  // longer provably keys of the `alerts` namespace and `t()` rejects them.
} as const;

/**
 * The Alerts section's two rows (ADR 40): which of the nine end-of-run sounds
 * plays, and how long GLU keeps playing it.
 *
 * The section's one unusual property: **every tap here makes a sound**, because
 * choosing an alert you cannot hear is choosing blind, and a rung labelled 20 s
 * is a claim about length that only your ears can check. What makes that safe to
 * offer is the cancel rule — any tap stops the previous preview, tapping the
 * playing sound stops it outright, and closing Settings unmounts this component,
 * which stops it too (the only "Settings closed" signal it gets).
 */
export function AlertSoundRows() {
  const t = useTranslations("alerts");
  const alertSoundId = useGluStore((s) => s.alertSoundId);
  const alertDurationSeconds = useGluStore((s) => s.alertDurationSeconds);
  const setAlertSoundId = useGluStore((s) => s.setAlertSoundId);
  const setAlertDurationSeconds = useGluStore((s) => s.setAlertDurationSeconds);

  // Resolved on read as well as on write (ADR 28's rule): a hand-edited blob
  // must not leave either control with nothing selected.
  const sound = resolveAlertSound(alertSoundId);
  const seconds = resolveAlertDurationSeconds(alertDurationSeconds);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const silence = useCallback(() => {
    if (endTimer.current !== null) clearTimeout(endTimer.current);
    endTimer.current = null;
    stopAlertSound();
    setPlayingId(null);
  }, []);

  // The modal unmounts its children on close, so this *is* "the user left
  // Settings" — a twenty-second preview must not outlive the surface that
  // started it.
  useEffect(() => silence, [silence]);

  const preview = (id: string, forSeconds: number) => {
    // Inside the tap handler's synchronous span, exactly like the Start gesture
    // (ADR 18) — for many users this is the first sound the app ever makes, so
    // it is also the first chance the context has to exist.
    primeAudio();
    playAlertSound(id, forSeconds);
    setPlayingId(id);
    if (endTimer.current !== null) clearTimeout(endTimer.current);
    endTimer.current = setTimeout(
      () => setPlayingId(null),
      alertPlaybackSeconds(resolveAlertSound(id), forSeconds) * 1000,
    );
  };

  const chooseSound = (id: string) => {
    // The second tap on a sound that is currently playing is a stop, not a
    // re-play: the button the user reaches for to end the noise is the one
    // making it.
    if (id === sound.id && playingId === id) {
      silence();
      return;
    }
    setAlertSoundId(id);
    preview(id, seconds);
  };

  // Inside the component because it needs `t`: the 0 rung is the sound's own
  // length played once, so it says a word rather than a number.
  const durationLabel = (forSeconds: number) =>
    forSeconds === ALERT_DURATION_ONCE
      ? t("durationOnce")
      : t("durationSeconds", { count: forSeconds });

  const chooseDuration = (value: string) => {
    const next = Number(value);
    setAlertDurationSeconds(next);
    preview(sound.id, resolveAlertDurationSeconds(next));
  };

  /** Roving arrow keys, which a hand-rolled radiogroup owes its keyboard users. */
  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = ALERT_SOUNDS.findIndex((entry) => entry.id === sound.id);
    const next = ALERT_SOUNDS[(index + step + ALERT_SOUNDS.length) % ALERT_SOUNDS.length];
    chooseSound(next.id);
    // Selection follows focus in a radiogroup, so focus has to follow it back.
    event.currentTarget.querySelector<HTMLElement>(`[data-sound-id="${next.id}"]`)?.focus();
  };

  return (
    <Stack gap="xs">
      <div className={classes.field} data-testid="setting-alert-sound">
        <Text component="span" className={classes.fieldLabel} id="alert-sound-label">
          {t("soundLabel")}
        </Text>
        <Text component="span" className={classes.fieldDescription}>
          {t("soundDescription")}
        </Text>
        <div
          className={classes.soundGrid}
          role="radiogroup"
          aria-labelledby="alert-sound-label"
          onKeyDown={onGridKeyDown}
        >
          {ALERT_SOUNDS.map((entry) => {
            const selected = entry.id === sound.id;
            const key = SOUND_KEY[entry.id as keyof typeof SOUND_KEY];
            return (
              <UnstyledButton
                key={entry.id}
                role="radio"
                aria-checked={selected}
                /* Roving tabindex: one stop for the whole group, as a native
                   radio group has. */
                tabIndex={selected ? 0 : -1}
                className={classes.soundButton}
                data-selected={selected}
                data-playing={playingId === entry.id}
                data-sound-id={entry.id}
                data-testid={`alert-sound-${entry.id}`}
                onClick={() => chooseSound(entry.id)}
              >
                {key ? t(key) : entry.label}
              </UnstyledButton>
            );
          })}
        </div>
      </div>

      <div className={classes.field} data-testid="setting-alert-duration">
        <Text component="span" className={classes.fieldLabel} id="alert-duration-label">
          {t("durationLabel")}
        </Text>
        <Text component="span" className={classes.fieldDescription}>
          {t("durationDescription")}
        </Text>
        <SegmentedControl
          fullWidth
          className={classes.segmented}
          /* The visible label *is* the accessible name (ADR 28) — an
             `aria-label` here would be a second, invisible copy to keep in sync. */
          aria-labelledby="alert-duration-label"
          value={String(seconds)}
          onChange={chooseDuration}
          data={ALERT_DURATION_CHOICES.map((choice) => ({
            value: String(choice),
            label: durationLabel(choice),
          }))}
        />
      </div>
    </Stack>
  );
}
