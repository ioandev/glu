/**
 * The end-of-run sound library and the WebAudio engine that plays it (ADR 40).
 *
 * ADR 18 shipped one hard-coded two-tone chime; this module promotes that
 * pattern to a **registry** — nine sounds, each a data literal — and adds a
 * bounded play length. Everything is still synthesized: no asset to source,
 * license, ship in two build contexts (ADR 22) or fetch on the one code path
 * that has to work when the network does not, and the Privacy Policy's "the
 * sound is generated in the browser, nothing is downloaded" stays literally
 * true (ADR 26).
 *
 * One `AudioContext` for the app's lifetime — iOS caps concurrent contexts, so
 * we prime once and reuse forever (ADR 18's rule, unchanged).
 */

/** One partial of a sound. The vocabulary is ADR 18's chime, generalised. */
export interface AlertTone {
  frequency: number;
  /** Seconds from the start of the pattern. */
  startsAt: number;
  /** Seconds the tone sounds for. */
  duration: number;
  /** Sine unless the sound wants an edge. */
  type?: OscillatorType;
  /** Peak gain. Kept ≤0.25 so stacked partials cannot clip (ADR 40). */
  gain?: number;
}

export interface AlertSound {
  id: string;
  /** The visible name in Settings, and the button's accessible name. */
  label: string;
  tones: AlertTone[];
  /**
   * The sound's own length in seconds — what "Once" plays, and the interval
   * between repetitions. Stated rather than derived from the last tone's end
   * because the gap *is* part of the character: Wood wants space, Bell wants to
   * ring out, and deriving it would give all nine the same rhythm.
   */
  period: number;
}

const DEFAULT_GAIN = 0.2;

/**
 * Nine sounds, spanning the three reasons anyone changes this setting: nicer
 * (Bell, Glass), harder to miss (Pulse, Digital, Wood), quieter in a shared
 * room (Deep, Settle).
 */
export const ALERT_SOUNDS: readonly AlertSound[] = [
  {
    // ADR 18's chime, byte-identical: the default is the shipped behaviour.
    id: "chime",
    label: "Chime",
    period: 1.6,
    tones: [
      { frequency: 660, startsAt: 0, duration: 0.55, gain: 0.22 },
      { frequency: 990, startsAt: 0.28, duration: 0.75, gain: 0.22 },
    ],
  },
  {
    // Struck bell: a fundamental plus deliberately inharmonic partials, which
    // is what stops a stack of sines sounding like an organ.
    id: "bell",
    label: "Bell",
    period: 2.2,
    tones: [
      { frequency: 440, startsAt: 0, duration: 1.9, gain: 0.2 },
      { frequency: 880, startsAt: 0, duration: 1.5, gain: 0.09 },
      { frequency: 1174, startsAt: 0, duration: 1.1, gain: 0.05 },
      { frequency: 2093, startsAt: 0, duration: 0.7, gain: 0.03 },
    ],
  },
  {
    // Two dry hits. Short and triangle-shaped: the closest a synthesized tone
    // gets to something struck rather than sung.
    id: "wood",
    label: "Wood",
    period: 1.0,
    tones: [
      {
        frequency: 880,
        startsAt: 0,
        duration: 0.12,
        type: "triangle",
        gain: 0.22,
      },
      {
        frequency: 1320,
        startsAt: 0.17,
        duration: 0.12,
        type: "triangle",
        gain: 0.18,
      },
    ],
  },
  {
    id: "rise",
    label: "Rise",
    period: 1.5,
    tones: [
      { frequency: 523, startsAt: 0, duration: 0.3, gain: 0.2 },
      { frequency: 659, startsAt: 0.14, duration: 0.3, gain: 0.2 },
      { frequency: 784, startsAt: 0.28, duration: 0.3, gain: 0.2 },
      { frequency: 1047, startsAt: 0.42, duration: 0.6, gain: 0.2 },
    ],
  },
  {
    // The same four notes falling — the "we're done, sit back" reading rather
    // than the "attention" one.
    id: "settle",
    label: "Settle",
    period: 1.7,
    tones: [
      { frequency: 1047, startsAt: 0, duration: 0.3, gain: 0.18 },
      { frequency: 784, startsAt: 0.16, duration: 0.3, gain: 0.18 },
      { frequency: 659, startsAt: 0.32, duration: 0.3, gain: 0.18 },
      { frequency: 523, startsAt: 0.48, duration: 0.8, gain: 0.18 },
    ],
  },
  {
    id: "pulse",
    label: "Pulse",
    period: 1.4,
    tones: [
      {
        frequency: 700,
        startsAt: 0,
        duration: 0.12,
        type: "square",
        gain: 0.12,
      },
      {
        frequency: 700,
        startsAt: 0.3,
        duration: 0.12,
        type: "square",
        gain: 0.12,
      },
      {
        frequency: 700,
        startsAt: 0.6,
        duration: 0.12,
        type: "square",
        gain: 0.12,
      },
    ],
  },
  {
    // The wristwatch alarm: two fast beeps, twice. Hardest of the nine to sleep
    // through, which is the entire brief for one of them.
    id: "digital",
    label: "Digital",
    period: 1.3,
    tones: [
      {
        frequency: 1600,
        startsAt: 0,
        duration: 0.09,
        type: "square",
        gain: 0.1,
      },
      {
        frequency: 1600,
        startsAt: 0.14,
        duration: 0.09,
        type: "square",
        gain: 0.1,
      },
      {
        frequency: 1600,
        startsAt: 0.42,
        duration: 0.09,
        type: "square",
        gain: 0.1,
      },
      {
        frequency: 1600,
        startsAt: 0.56,
        duration: 0.09,
        type: "square",
        gain: 0.1,
      },
    ],
  },
  {
    id: "glass",
    label: "Glass",
    period: 1.8,
    tones: [
      { frequency: 1568, startsAt: 0, duration: 1.3, gain: 0.12 },
      { frequency: 2093, startsAt: 0.06, duration: 1.1, gain: 0.07 },
      { frequency: 3136, startsAt: 0.12, duration: 0.8, gain: 0.04 },
    ],
  },
  {
    // For a shared room: felt more than heard, and it carries through a wall
    // less than the bright ones do.
    id: "deep",
    label: "Deep",
    period: 2.0,
    tones: [
      { frequency: 110, startsAt: 0, duration: 1.5, gain: 0.25 },
      { frequency: 220, startsAt: 0, duration: 1.2, gain: 0.1 },
      { frequency: 330, startsAt: 0.1, duration: 0.6, gain: 0.04 },
    ],
  },
];

export const DEFAULT_ALERT_SOUND_ID = "chime";

/**
 * Play the pattern exactly one time. Stored as `0`, named — a blob that read
 * "0 seconds" would be a small lie about a sound that runs for 1.2 s.
 */
export const ALERT_DURATION_ONCE = 0;

/**
 * How long GLU keeps alerting, in seconds. Five rungs, ADR 28's ladder shape:
 * a coarse judgment with five real answers, no keyboard, no continuum. The 20 s
 * ceiling is the line that keeps a bounded duration from becoming the
 * dismiss-me alarm ADR 18 rejected — every rung ends by itself.
 */
export const ALERT_DURATION_CHOICES = [ALERT_DURATION_ONCE, 3, 5, 10, 20] as const;

export const DEFAULT_ALERT_DURATION_SECONDS = ALERT_DURATION_ONCE;

/**
 * Both resolvers take `unknown` and resolve on **read as well as write**
 * (ADR 28's deviation, adopted as the rule): a sound id from a release that
 * shipped something this one dropped, or a hand-edited `999`, must render a
 * selected control and still make a sound — never a control with nothing
 * selected, and never silence.
 */
export function resolveAlertSound(id: unknown): AlertSound {
  return ALERT_SOUNDS.find((sound) => sound.id === id) ?? ALERT_SOUNDS[0];
}

export function resolveAlertDurationSeconds(value: unknown): number {
  return (ALERT_DURATION_CHOICES as readonly unknown[]).includes(value)
    ? (value as number)
    : DEFAULT_ALERT_DURATION_SECONDS;
}

/**
 * How many times the pattern starts.
 *
 * **A repetition that starts before the deadline plays in full** — starts land
 * at `0, period, 2·period …` while strictly under the chosen seconds, so the
 * audible tail may run past the rung by up to one period. Cutting the last
 * repetition mid-tone would make every sound end like a dropped call; the rung
 * is how long GLU keeps alerting, not a stopwatch on the speaker.
 */
export function alertRepeatCount(sound: AlertSound, seconds: unknown): number {
  const chosen = resolveAlertDurationSeconds(seconds);
  if (chosen === ALERT_DURATION_ONCE) return 1;
  return Math.max(1, Math.ceil(chosen / sound.period));
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
let unavailable = false;

/** The playback in flight, if any — the handle `stopAlertSound` needs. */
let active: { master: GainNode; oscillators: OscillatorNode[] } | null = null;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Create/resume the context **inside a user-gesture handler** — the gesture
 * browsers require, at the only moment that guarantees one. iOS needs the
 * `resume()` inside the handler's synchronous span, so this never awaits.
 */
export function primeAudio(): void {
  if (unavailable) return;
  const Ctor = audioContextCtor();
  if (!Ctor) {
    unavailable = true;
    return;
  }
  try {
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    unavailable = true;
  }
}

/**
 * Plays the chosen sound for the chosen length. Cancels whatever was playing —
 * two alerts overlapping is never what anyone meant, and it is what makes the
 * Settings preview safe to offer at 20 s.
 */
export function playAlertSound(soundId: unknown, seconds: unknown): void {
  if (unavailable) return;
  primeAudio();
  const ctx = context;
  if (!ctx) return;

  stopAlertSound();

  const sound = resolveAlertSound(soundId);
  const repeats = alertRepeatCount(sound, seconds);

  try {
    // The context can regress to `suspended` after a long idle on iOS. The
    // resume here is fallible on purpose: audio failing must never take the
    // notification path down with it (ADR 18).
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});

    // Everything routes through one master gain, which is what makes stopping
    // a two-line operation instead of a bookkeeping exercise.
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const now = ctx.currentTime;

    for (let repeat = 0; repeat < repeats; repeat += 1) {
      const patternStart = now + repeat * sound.period;
      for (const tone of sound.tones) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = tone.type ?? "sine";
        oscillator.frequency.value = tone.frequency;

        const start = patternStart + tone.startsAt;
        const end = start + tone.duration;
        // A soft attack and an exponential tail: a beep with a hard edge reads
        // as an error sound, which is the wrong feeling for finishing a
        // session. The floor is 0.0001 because an exponential ramp to zero
        // throws.
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(tone.gain ?? DEFAULT_GAIN, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain).connect(master);
        oscillator.start(start);
        oscillator.stop(end + 0.02);
        oscillators.push(oscillator);
      }
    }

    active = { master, oscillators };
  } catch {
    // Courtesy, never load-bearing.
    active = null;
  }
}

/**
 * Stops the sound in flight. Ramped, not cut: silencing a sine mid-cycle
 * produces exactly the click this module spends three lines of envelope
 * avoiding.
 */
export function stopAlertSound(): void {
  const playing = active;
  const ctx = context;
  active = null;
  if (!playing || !ctx) return;
  try {
    const now = ctx.currentTime;
    const fadeOut = 0.05;
    playing.master.gain.cancelScheduledValues(now);
    playing.master.gain.setValueAtTime(playing.master.gain.value, now);
    playing.master.gain.linearRampToValueAtTime(0, now + fadeOut);
    for (const oscillator of playing.oscillators) oscillator.stop(now + fadeOut + 0.01);
  } catch {
    // A node already stopped throws on some engines; nothing to recover.
  }
}

/**
 * How long the whole playback lasts, tail included — what the Settings row
 * counts down to drop its playing state. It is `repeats × period`, which is why
 * it can exceed the chosen rung: see `alertRepeatCount`.
 */
export function alertPlaybackSeconds(sound: AlertSound, seconds: unknown): number {
  return alertRepeatCount(sound, seconds) * sound.period;
}

/** Test seam. */
export function resetAlertAudio() {
  context = null;
  unavailable = false;
  active = null;
}
