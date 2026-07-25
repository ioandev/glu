"use client";

import { useEffect, useState } from "react";
import { useGluStore } from "@/store/gluStore";

/**
 * localStorage does not exist on the server, so the store hydrates with
 * defaults and picks up the persisted blob in a mount effect (ADR 02). Anything
 * whose first paint would otherwise flicker gates on this flag.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useGluStore.persist.hasHydrated());

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setHydrated(true);
    };
    const unsub = useGluStore.persist.onFinishHydration(finish);
    if (!useGluStore.persist.hasHydrated()) {
      void useGluStore.persist.rehydrate();
    } else {
      finish();
    }
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return hydrated;
}
