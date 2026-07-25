"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_DURATION_MS, MIN_TOTAL_MS } from "@/lib/time";
import { DEFAULT_CHROME_ID, type ChromeId } from "@/chrome/types";
import { CLOCKS, DEFAULT_CLOCK_ID, resolveClock } from "@/clocks/registry";
import type { TodoistSource } from "@/components/todoist/types";
import { createVersionedKeyStorage, CURRENT_BLOB_VERSION } from "./storage";
import {
  ARCHIVE_CAP_DAYS,
  OUTBOX_CAP,
  ENVIRONMENT_KEYS,
  SOUND_ENVIRONMENT_KEYS,
  type DayRecord,
  type EnvironmentKey,
  type EnvironmentState,
  type FocusedTask,
  type OutboxEntry,
  type RunEndEvent,
  type RunEndKind,
  type SessionRecord,
  type TimerStatus,
} from "./types";

/**
 * The persisted partition — this object *is* the `glu:vN` blob (ADR 02).
 * The 50 ms display value is deliberately absent: it is derived from `endAt`,
 * and putting it here would turn every tick into a localStorage write.
 */
export interface GluPersistedState {
  status: TimerStatus;
  /** Epoch ms the current run ends at; only meaningful while `running`. */
  endAt: number | null;
  /** Authoritative remaining ms when *not* running. */
  remaining: number;
  /** The current run's total ms — what progress fractions are drawn against. */
  total: number;
  /** The last preset the user chose; Stop and `n` reset to this. */
  selectedDuration: number;
  /** Identity of the current run; ADR 05's idempotency key. */
  runId: string | null;
  /** Actual running time accumulated across pauses (ADR 14, amended into 02). */
  ranMs: number;
  /** When the current running stretch began; null unless `running`. */
  runningSince: number | null;
  environment: EnvironmentState;
  /** ADR 15: additive preference field, default `studio-quiet`. */
  chromeThemeId: ChromeId;
  /** ADR 08: the gallery's position — the same fact as "which clock". */
  activeClockId: string;
  /** ADR 08: display preference about session data, lives with the session UI. */
  showSessionOnClock: boolean;
  /** ADR 12: the chosen task source. Survives logout (ADR 19). */
  todoistSource: TodoistSource | null;
  /** ADR 14: the pinned task. Survives logout (ADR 19). */
  focusedTask: FocusedTask | null;
  /** ADR 14: time comments awaiting their grace deadline or a retry. */
  outbox: OutboxEntry[];
  /** ADR 05: the current seating. Its length is the visible count. */
  day: DayRecord;
  /** ADR 05: previous days, most recent last, capped at 90. Local-only. */
  archive: DayRecord[];
  /**
   * ADR 05's idempotency ledger. Both paths into `finished` (the live tick and
   * the restored-while-away branch) funnel through one recorder, and the
   * persisted `finished` state carries its `runId` — so a second reload is a
   * no-op instead of a double count.
   */
  recordedRunIds: string[];
}

export interface GluState extends GluPersistedState {
  setPreset: (durationMs: number) => void;
  adjust: (deltaMs: number) => void;
  start: () => void;
  pause: () => void;
  togglePause: () => void;
  stop: () => void;
  /** ADR 06 `n`: abandon the current run, start a fresh one, record nothing. */
  restart: () => void;
  /** Called by the tick loop and by rehydration when `endAt` has passed. */
  finish: () => void;
  toggleEnvironment: (key: EnvironmentKey) => void;
  setChromeTheme: (id: ChromeId) => void;
  setActiveClock: (id: string) => void;
  /** Moves `step` places through the registry, wrapping at both ends. */
  flipClock: (step: number) => void;
  setShowSessionOnClock: (value: boolean) => void;
  setTodoistSource: (source: TodoistSource | null) => void;
  setFocusedTask: (task: FocusedTask | null) => void;
  enqueueComment: (entry: OutboxEntry) => void;
  /** Undo: removes the entry before it is ever sent. */
  dropOutboxEntry: (runId: string) => void;
  /** Commits an entry early — used when a second run end displaces it. */
  commitOutboxEntry: (runId: string) => void;
  markOutboxAttempt: (runId: string) => void;
  /** Archives the outgoing day (if non-empty) and empties the current one. */
  newDay: () => void;
}

export const emptyEnvironment = (): EnvironmentState =>
  Object.fromEntries(ENVIRONMENT_KEYS.map((k) => [k, false])) as EnvironmentState;

export const initialPersistedState = (): GluPersistedState => ({
  status: "idle",
  endAt: null,
  remaining: DEFAULT_DURATION_MS,
  total: DEFAULT_DURATION_MS,
  selectedDuration: DEFAULT_DURATION_MS,
  runId: null,
  ranMs: 0,
  runningSince: null,
  environment: emptyEnvironment(),
  chromeThemeId: DEFAULT_CHROME_ID,
  activeClockId: DEFAULT_CLOCK_ID,
  showSessionOnClock: true,
  todoistSource: null,
  focusedTask: null,
  outbox: [],
  day: { startedAt: 0, sessions: [] },
  archive: [],
  recordedRunIds: [],
});

// ---------------------------------------------------------------------------
// Run-end event bus
// ---------------------------------------------------------------------------

type RunEndListener = (event: RunEndEvent) => void;
const runEndListeners = new Set<RunEndListener>();

/** Subscribe to run-end events (ADR 02 amendment; consumed by ADR 14). */
export function onRunEnd(listener: RunEndListener): () => void {
  runEndListeners.add(listener);
  return () => {
    runEndListeners.delete(listener);
  };
}

function emitRunEnd(event: RunEndEvent) {
  for (const listener of [...runEndListeners]) listener(event);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let runCounter = 0;
/** Deterministic enough to be testable, unique enough to key idempotency on. */
function mintRunId(now: number): string {
  runCounter += 1;
  return `run-${now}-${runCounter}`;
}

/** Remaining ms right now, whichever state we are in. */
export function liveRemaining(state: GluPersistedState, now: number): number {
  if (state.status === "running" && state.endAt !== null) {
    return Math.max(0, state.endAt - now);
  }
  return Math.max(0, state.remaining);
}

/**
 * `ranMs` including the stretch currently in progress.
 *
 * The stretch is capped at `endAt`: on the restored-expired path the app may
 * open hours after the run ended, and hours of closed-tab time are not
 * attention (ADR 14's gotcha).
 */
function accumulatedRanMs(state: GluPersistedState, now: number): number {
  if (state.status !== "running" || state.runningSince === null) return state.ranMs;
  const until = state.endAt !== null ? Math.min(now, state.endAt) : now;
  return state.ranMs + Math.max(0, until - state.runningSince);
}

/**
 * ADR 05: recording is idempotent, keyed by run. Produced in exactly one place,
 * so both entry paths into `finished` — the live tick and the
 * restored-while-away branch — agree by construction. Returns an empty patch
 * when this run has already been recorded.
 */
function sessionPatch(
  state: GluPersistedState,
  event: RunEndEvent,
): Partial<GluPersistedState> {
  if (state.recordedRunIds.includes(event.runId)) return {};
  const record: SessionRecord = {
    endedAt: event.endedAt,
    durationMs: event.totalMs,
    // Completion snapshot: start-state is stale the moment the user toggles
    // mid-run, so the freshest truth wins (ADR 05).
    environment: { ...state.environment },
  };
  return {
    day: {
      startedAt: state.day.startedAt || event.endedAt,
      sessions: [...state.day.sessions, record],
    },
    // Bounded ledger: idempotency only has to survive reloads, not forever.
    recordedRunIds: [...state.recordedRunIds, event.runId].slice(-50),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGluStore = create<GluState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState(),

      setPreset: (durationMs) =>
        set((state) => {
          const now = Date.now();
          const base = {
            selectedDuration: durationMs,
            total: durationMs,
            remaining: durationMs,
          };
          if (state.status === "running") {
            return { ...base, endAt: now + durationMs };
          }
          return base;
        }),

      adjust: (deltaMs) => {
        const state = get();
        const now = Date.now();
        const current = liveRemaining(state, now);
        const nextRemaining = Math.max(0, current + deltaMs);
        const nextTotal = Math.max(state.total + deltaMs, nextRemaining, MIN_TOTAL_MS);

        if (nextRemaining === 0) {
          // Subtracting past zero completes the timer (ADR 02).
          set({ total: nextTotal, remaining: 0, endAt: state.endAt });
          get().finish();
          return;
        }

        set({
          total: nextTotal,
          remaining: nextRemaining,
          endAt: state.status === "running" ? now + nextRemaining : null,
        });
      },

      start: () => {
        const state = get();
        const now = Date.now();

        if (state.status === "paused" && state.runId) {
          // Resume: same run, clock restarted from the frozen remaining.
          set({
            status: "running",
            endAt: now + state.remaining,
            runningSince: now,
          });
          return;
        }
        if (state.status === "running") return;

        // idle or finished → a brand new run at the selected duration (ADR 05).
        const total = state.status === "finished" ? state.selectedDuration : state.total;
        const remaining = state.status === "finished" ? state.selectedDuration : state.remaining;
        set({
          status: "running",
          total,
          remaining,
          endAt: now + remaining,
          runId: mintRunId(now),
          ranMs: 0,
          runningSince: now,
        });
      },

      pause: () => {
        const state = get();
        if (state.status !== "running") return;
        const now = Date.now();
        set({
          status: "paused",
          remaining: liveRemaining(state, now),
          ranMs: accumulatedRanMs(state, now),
          endAt: null,
          runningSince: null,
        });
      },

      togglePause: () => {
        const status = get().status;
        if (status === "running") get().pause();
        else if (status === "paused") get().start();
      },

      stop: () => {
        const state = get();
        const now = Date.now();
        if (state.status === "running" || state.status === "paused") {
          endRun(state, now, "stopped");
        }
        set({
          status: "idle",
          total: state.selectedDuration,
          remaining: state.selectedDuration,
          endAt: null,
          runId: null,
          ranMs: 0,
          runningSince: null,
        });
      },

      restart: () => {
        const state = get();
        const now = Date.now();
        if (state.status === "running" || state.status === "paused") {
          endRun(state, now, "restarted");
        }
        // One transition, one write: abandon and start collapse into a single set.
        set({
          status: "running",
          total: state.selectedDuration,
          remaining: state.selectedDuration,
          endAt: now + state.selectedDuration,
          runId: mintRunId(now),
          ranMs: 0,
          runningSince: now,
        });
      },

      finish: () => {
        const state = get();
        if (state.status === "finished") return;
        const now = Date.now();
        const event = state.runId ? runEndEvent(state, now, "finished") : null;

        // One transition, one write (ADR 02): the finished state and the session
        // record land in a single `set`.
        set({
          status: "finished",
          remaining: 0,
          endAt: null,
          ranMs: accumulatedRanMs(state, now),
          runningSince: null,
          ...(event ? sessionPatch(state, event) : {}),
        });

        if (event) emitRunEnd(event);
      },

      toggleEnvironment: (key) =>
        set((state) => ({ environment: nextEnvironment(state.environment, key) })),

      setChromeTheme: (id) => set({ chromeThemeId: id }),

      setActiveClock: (id) => set({ activeClockId: resolveClock(id).id }),

      flipClock: (step) =>
        set((state) => {
          const current = CLOCKS.findIndex((c) => c.id === resolveClock(state.activeClockId).id);
          // `(i + n) % n` — the negative-index classic (ADR 08).
          const next = (current + step + CLOCKS.length) % CLOCKS.length;
          return { activeClockId: CLOCKS[next].id };
        }),

      setShowSessionOnClock: (value) => set({ showSessionOnClock: value }),

      setTodoistSource: (source) => set({ todoistSource: source }),

      setFocusedTask: (task) => set({ focusedTask: task }),

      enqueueComment: (entry) =>
        set((state) => {
          // Idempotent per run: a run posts at most one comment, ever.
          if (state.outbox.some((existing) => existing.runId === entry.runId)) return {};
          return { outbox: [...state.outbox, entry].slice(-OUTBOX_CAP) };
        }),

      dropOutboxEntry: (runId) =>
        set((state) => ({ outbox: state.outbox.filter((entry) => entry.runId !== runId) })),

      commitOutboxEntry: (runId) =>
        set((state) => ({
          outbox: state.outbox.map((entry) =>
            entry.runId === runId ? { ...entry, postAfter: 0 } : entry,
          ),
        })),

      markOutboxAttempt: (runId) =>
        set((state) => {
          // Stamping the attempt time is what makes the backoff a backoff:
          // `isDue` counts from here, not from the entry's fixed `postAfter`.
          const now = Date.now();
          return {
            outbox: state.outbox.map((entry) =>
              entry.runId === runId
                ? { ...entry, attempts: entry.attempts + 1, lastAttemptAt: now }
                : entry,
            ),
          };
        }),

      newDay: () =>
        set((state) => {
          const now = Date.now();
          // Archive before clearing: a reset that destroys the only tracked data
          // contradicts the product's reason to exist (ADR 05).
          const archive =
            state.day.sessions.length > 0
              ? [...state.archive, state.day].slice(-ARCHIVE_CAP_DAYS)
              : state.archive;
          // Deliberately does not touch the timer or the environment toggles —
          // a new day doesn't move the user to a new room.
          return { archive, day: { startedAt: now, sessions: [] } };
        }),
    }),
    {
      name: "glu",
      version: CURRENT_BLOB_VERSION,
      storage: createVersionedKeyStorage<GluPersistedState>(),
      // localStorage does not exist during SSR; hydration happens in a mount
      // effect instead, which is what keeps first paint free of mismatches.
      skipHydration: true,
      partialize: (state): GluPersistedState => ({
        status: state.status,
        endAt: state.endAt,
        remaining: state.remaining,
        total: state.total,
        selectedDuration: state.selectedDuration,
        runId: state.runId,
        ranMs: state.ranMs,
        runningSince: state.runningSince,
        environment: state.environment,
        chromeThemeId: state.chromeThemeId,
        activeClockId: state.activeClockId,
        showSessionOnClock: state.showSessionOnClock,
        todoistSource: state.todoistSource,
        focusedTask: state.focusedTask,
        outbox: state.outbox,
        day: state.day,
        archive: state.archive,
        recordedRunIds: state.recordedRunIds,
      }),
      migrate: (persisted, fromVersion) => {
        // v1 → v2: day/archive/ledger added empty; every v1 field survives, which
        // is exactly why the version field exists — an upgrade must never wipe a
        // running timer (ADR 05). Migration happens on read; the v2 write-back
        // then happens once.
        const state = (persisted ?? {}) as Partial<GluPersistedState>;
        if (fromVersion < 2) {
          return {
            ...initialPersistedState(),
            ...state,
            day: { startedAt: 0, sessions: [] },
            archive: [],
            recordedRunIds: [],
          } as GluPersistedState;
        }
        return { ...initialPersistedState(), ...state } as GluPersistedState;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        settleAfterRehydrate();
      },
    },
  ),
);

function runEndEvent(
  state: GluPersistedState,
  now: number,
  endKind: RunEndKind,
): RunEndEvent {
  return {
    runId: state.runId!,
    ranMs: accumulatedRanMs(state, now),
    endKind,
    totalMs: state.total,
    endedAt: now,
  };
}

/**
 * A run that stops being current without completing: nothing is recorded (only
 * `finished` counts — ADR 05), but ADR 14's listeners still hear about it.
 */
function endRun(state: GluPersistedState, now: number, endKind: RunEndKind) {
  if (!state.runId) return;
  emitRunEnd(runEndEvent(state, now, endKind));
}

/**
 * The ran-out-while-away branch (ADR 02): a restored `running` state whose
 * `endAt` is already in the past loads straight into `finished`, silently. It
 * is its own branch at load — not something the tick loop discovers.
 */
export function settleAfterRehydrate(now: number = Date.now()) {
  const state = useGluStore.getState();
  if (state.status === "running" && state.endAt !== null && state.endAt <= now) {
    state.finish();
  }
}

/**
 * The Silence rule lives in exactly one function (ADR 02): Silence clears the
 * four sound environments, any of them clears Silence, Headphones is orthogonal.
 */
export function nextEnvironment(
  current: EnvironmentState,
  key: EnvironmentKey,
): EnvironmentState {
  const next: EnvironmentState = { ...current, [key]: !current[key] };
  if (key === "silence" && next.silence) {
    for (const soundKey of SOUND_ENVIRONMENT_KEYS) next[soundKey] = false;
  } else if ((SOUND_ENVIRONMENT_KEYS as readonly string[]).includes(key) && next[key]) {
    next.silence = false;
  }
  return next;
}

/** Test seam: reset the store to a clean slate. */
export function resetGluStore() {
  useGluStore.setState(initialPersistedState());
}
