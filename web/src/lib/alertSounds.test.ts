import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALERT_DURATION_CHOICES,
  ALERT_DURATION_ONCE,
  ALERT_SOUNDS,
  alertPlaybackSeconds,
  alertRepeatCount,
  DEFAULT_ALERT_DURATION_SECONDS,
  DEFAULT_ALERT_SOUND_ID,
  playAlertSound,
  resetAlertAudio,
  resolveAlertDurationSeconds,
  resolveAlertSound,
  stopAlertSound,
} from "./alertSounds";

/* -- WebAudio double ------------------------------------------------------- */

type Started = { frequency: number; type: OscillatorType; startedAt: number; stopAt: number };

let started: Started[];
let masterGains: FakeGain[];
let contextsCreated: number;

class FakeGain {
  connected: unknown = null;
  isMaster = false;
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
  connect(next: unknown) {
    this.connected = next;
    return next;
  }
}

class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = { name: "destination" } as unknown as AudioDestinationNode;
  constructor() {
    contextsCreated += 1;
  }
  resume = vi.fn(async () => {});
  createOscillator() {
    const record: Started = { frequency: 0, type: "sine", startedAt: -1, stopAt: -1 };
    const node = {
      set type(value: OscillatorType) {
        record.type = value;
      },
      get type() {
        return record.type;
      },
      frequency: {
        set value(hz: number) {
          record.frequency = hz;
        },
        get value() {
          return record.frequency;
        },
      },
      connect: (next: unknown) => next,
      start: (at: number) => {
        record.startedAt = at;
        started.push(record);
      },
      stop: (at: number) => {
        record.stopAt = at;
      },
    };
    return node as unknown as OscillatorNode;
  }
  createGain() {
    const node = new FakeGain();
    // The master is the one node wired straight to the destination.
    const connect = node.connect.bind(node);
    node.connect = (next: unknown) => {
      if (next === this.destination) {
        node.isMaster = true;
        masterGains.push(node);
      }
      return connect(next);
    };
    return node as unknown as GainNode;
  }
}

beforeEach(() => {
  started = [];
  masterGains = [];
  contextsCreated = 0;
  resetAlertAudio();
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    writable: true,
    value: FakeAudioContext,
  });
});

afterEach(() => {
  Reflect.deleteProperty(window as unknown as Record<string, unknown>, "AudioContext");
  resetAlertAudio();
});

describe("the sound library (ADR 40)", () => {
  it("ships nine sounds with unique ids, the brief's 5–10", () => {
    expect(ALERT_SOUNDS).toHaveLength(9);
    expect(new Set(ALERT_SOUNDS.map((s) => s.id)).size).toBe(9);
    expect(ALERT_SOUNDS[0].id).toBe(DEFAULT_ALERT_SOUND_ID);
  });

  it("gives every sound a period at least as long as its last tone", () => {
    // Otherwise a repetition overlaps its own tail — nine hand-written numbers
    // are exactly the kind of thing that deserves an assertion.
    for (const sound of ALERT_SOUNDS) {
      const lastEnd = Math.max(...sound.tones.map((t) => t.startsAt + t.duration));
      expect(sound.period, sound.id).toBeGreaterThanOrEqual(lastEnd);
    }
  });

  it("keeps every sound under a clipping stack of gain", () => {
    for (const sound of ALERT_SOUNDS) {
      for (const tone of sound.tones) expect(tone.gain ?? 0.2, sound.id).toBeLessThanOrEqual(0.25);
      const summed = sound.tones.reduce((total, tone) => total + (tone.gain ?? 0.2), 0);
      expect(summed, sound.id).toBeLessThanOrEqual(1);
    }
  });

  it("keeps ADR 18's chime as the default, byte-identical", () => {
    const chime = resolveAlertSound(DEFAULT_ALERT_SOUND_ID);
    expect(chime.tones.map((t) => [t.frequency, t.startsAt, t.duration])).toEqual([
      [660, 0, 0.55],
      [990, 0.28, 0.75],
    ]);
    expect(DEFAULT_ALERT_DURATION_SECONDS).toBe(ALERT_DURATION_ONCE);
  });
});

describe("resolvers (ADR 40)", () => {
  it("falls back to Chime for anything that is not a shipped id", () => {
    for (const value of ["gong", "", null, undefined, 5, {}]) {
      expect(resolveAlertSound(value).id).toBe("chime");
    }
    expect(resolveAlertSound("bell").id).toBe("bell");
  });

  it("falls back to Once for anything off the ladder", () => {
    for (const value of [999, -1, NaN, "5", null, undefined]) {
      expect(resolveAlertDurationSeconds(value)).toBe(ALERT_DURATION_ONCE);
    }
    for (const choice of ALERT_DURATION_CHOICES) {
      expect(resolveAlertDurationSeconds(choice)).toBe(choice);
    }
  });
});

describe("the repeat arithmetic (ADR 40)", () => {
  const chime = resolveAlertSound("chime"); // period 1.6

  it("plays once for Once, whatever the sound", () => {
    for (const sound of ALERT_SOUNDS) {
      expect(alertRepeatCount(sound, ALERT_DURATION_ONCE)).toBe(1);
      expect(alertPlaybackSeconds(sound, ALERT_DURATION_ONCE)).toBe(sound.period);
    }
  });

  it("starts a repetition for every start that falls before the deadline", () => {
    // 0, 1.6, 3.2, 4.8 are under 5; 6.4 is not.
    expect(alertRepeatCount(chime, 5)).toBe(4);
    expect(alertRepeatCount(chime, 3)).toBe(2);
    expect(alertRepeatCount(chime, 10)).toBe(7);
    expect(alertRepeatCount(chime, 20)).toBe(13);
  });

  it("does not start one exactly on the deadline", () => {
    const wood = resolveAlertSound("wood"); // period 1.0, so 5 s is exact
    expect(alertRepeatCount(wood, 5)).toBe(5);
    expect(alertPlaybackSeconds(wood, 5)).toBe(5);
  });

  it("treats an off-ladder length as Once rather than as silence", () => {
    expect(alertRepeatCount(chime, 999)).toBe(1);
  });
});

describe("the engine (ADR 40)", () => {
  it("schedules every tone of the selected sound, once, for Once", () => {
    playAlertSound("bell", ALERT_DURATION_ONCE);
    expect(started).toHaveLength(4);
    expect(started.map((s) => s.frequency)).toEqual([440, 880, 1174, 2093]);
  });

  it("schedules repeats one period apart", () => {
    playAlertSound("chime", 5);
    expect(started).toHaveLength(8); // 4 repeats × 2 tones
    const firstOfEachRepeat = started.filter((s) => s.frequency === 660).map((s) => s.startedAt);
    expect(firstOfEachRepeat).toEqual([0, 1.6, 3.2, 4.800000000000001]);
  });

  it("honours a sound's oscillator type", () => {
    playAlertSound("digital", ALERT_DURATION_ONCE);
    expect(started.every((s) => s.type === "square")).toBe(true);
  });

  it("plays the default for an unknown id rather than nothing", () => {
    playAlertSound("gong", "forever");
    expect(started).toHaveLength(2);
    expect(started[0].frequency).toBe(660);
  });

  it("creates exactly one AudioContext across many plays", () => {
    playAlertSound("chime", ALERT_DURATION_ONCE);
    playAlertSound("bell", 3);
    playAlertSound("wood", 5);
    expect(contextsCreated).toBe(1);
  });

  it("cancels the sound in flight when another starts", () => {
    playAlertSound("deep", 20);
    const first = masterGains[0];
    playAlertSound("wood", ALERT_DURATION_ONCE);
    // Ramped to zero, never cut: a sine stopped mid-cycle clicks.
    expect(first.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.05);
    expect(masterGains).toHaveLength(2);
  });

  it("stops on request and stays stopped", () => {
    playAlertSound("deep", 20);
    const master = masterGains[0];
    stopAlertSound();
    expect(master.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.05);
    stopAlertSound(); // idempotent — nothing left to stop
    expect(master.gain.linearRampToValueAtTime).toHaveBeenCalledTimes(1);
  });

  it("survives having no WebAudio at all", () => {
    Reflect.deleteProperty(window as unknown as Record<string, unknown>, "AudioContext");
    resetAlertAudio();
    expect(() => playAlertSound("chime", 5)).not.toThrow();
    expect(() => stopAlertSound()).not.toThrow();
    expect(started).toHaveLength(0);
  });
});
