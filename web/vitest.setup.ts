import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * jsdom shims Mantine needs (ADR 03): miss `matchMedia` and the first Mantine
 * render throws in a way that reads like a component bug.
 */
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!("ResizeObserver" in window)) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

/**
 * Node 25 ships its own experimental `localStorage` global, which wins over
 * jsdom's and is inert without `--localstorage-file`. Replace it with a real
 * in-memory `Storage` so the persistence layer — and the
 * `Storage.prototype.setItem` spy the write-discipline test needs — behave.
 */
class MemoryStorage {
  #map = new Map<string, string>();
  get length() {
    return this.#map.size;
  }
  key(index: number) {
    return [...this.#map.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.#map.has(String(key)) ? this.#map.get(String(key))! : null;
  }
  setItem(key: string, value: string) {
    this.#map.set(String(key), String(value));
  }
  removeItem(key: string) {
    this.#map.delete(String(key));
  }
  clear() {
    this.#map.clear();
  }
}

if (typeof window.localStorage?.clear !== "function") {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "Storage", {
    configurable: true,
    writable: true,
    value: MemoryStorage,
  });
  for (const target of [window, globalThis]) {
    Object.defineProperty(target, "localStorage", {
      configurable: true,
      writable: true,
      value: storage,
    });
    Object.defineProperty(target, "sessionStorage", {
      configurable: true,
      writable: true,
      value: new MemoryStorage(),
    });
  }
}

if (!window.scrollTo) {
  Object.defineProperty(window, "scrollTo", { writable: true, value: vi.fn() });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
