/**
 * The session-end chime (ADR 18): a short two-tone envelope, synthesized with
 * WebAudio. No asset to source, license or fetch for a beep.
 *
 * One `AudioContext` for the app's lifetime — iOS caps concurrent contexts, so
 * we prime once and reuse forever.
 */

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
let unavailable = false;

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

/** Two tones, a fifth apart, ~1.2 s total. Once — this is not an alarm clock. */
const TONES = [
  { frequency: 660, startsAt: 0, duration: 0.55 },
  { frequency: 990, startsAt: 0.28, duration: 0.75 },
];

export function chime(): void {
  if (unavailable) return;
  primeAudio();
  const ctx = context;
  if (!ctx) return;

  try {
    // The context can regress to `suspended` after a long idle on iOS. The
    // resume here is fallible on purpose: audio failing must never take the
    // notification path down with it.
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    for (const tone of TONES) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tone.frequency;

      const start = now + tone.startsAt;
      const end = start + tone.duration;
      // A soft attack and an exponential tail: a beep with a hard edge reads as
      // an error sound, which is the wrong feeling for finishing a session.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  } catch {
    // Courtesy, never load-bearing.
  }
}

/** Test seam. */
export function resetChime() {
  context = null;
  unavailable = false;
}
