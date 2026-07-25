import type { PersistStorage, StorageValue } from "zustand/middleware";

/**
 * GLU's persisted blob lives under a **versioned key** (`glu:v1`, `glu:v2`, …)
 * because that is the contract ADRs 02 and 05 wrote down. Zustand's `persist`
 * middleware wants a single key and carries its own `version` inside the value,
 * so this adapter bridges the two: reads fall back through older keys (which is
 * what lets a v1 blob migrate in place), writes always land on the current key
 * and delete the superseded ones.
 */
export const CURRENT_BLOB_VERSION = 2;

export const blobKey = (version: number) => `glu:v${version}`;

/** Newest first — the read order. */
const KNOWN_KEYS = Array.from({ length: CURRENT_BLOB_VERSION }, (_, i) =>
  blobKey(CURRENT_BLOB_VERSION - i),
);

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    // Private mode / disabled storage: the app still works, it just forgets.
    return null;
  }
}

/**
 * @param onCorrupt what to load in place of a blob that will not parse. The
 *   default is "nothing at all", which is right for any caller that only cares
 *   about the data; ADR 31 passes one because it cares about something else —
 *   see the call site in `gluStore.ts`. Kept as a parameter rather than baked
 *   in so this adapter stays ignorant of what is inside the blob.
 */
export function createVersionedKeyStorage<T>(
  onCorrupt?: () => StorageValue<T>,
): PersistStorage<T> {
  return {
    getItem: (): StorageValue<T> | null => {
      const ls = safeLocalStorage();
      if (!ls) return null;
      for (const key of KNOWN_KEYS) {
        const raw = ls.getItem(key);
        if (raw === null) continue;
        try {
          return JSON.parse(raw) as StorageValue<T>;
        } catch {
          // A corrupt blob must load clean defaults, never throw (ADR 03).
          return onCorrupt?.() ?? null;
        }
      }
      return null;
    },
    setItem: (_name, value) => {
      const ls = safeLocalStorage();
      if (!ls) return;
      try {
        ls.setItem(blobKey(CURRENT_BLOB_VERSION), JSON.stringify(value));
      } catch {
        return;
      }
      for (const key of KNOWN_KEYS) {
        if (key !== blobKey(CURRENT_BLOB_VERSION)) ls.removeItem(key);
      }
    },
    removeItem: () => {
      const ls = safeLocalStorage();
      if (!ls) return;
      for (const key of KNOWN_KEYS) ls.removeItem(key);
    },
  };
}
