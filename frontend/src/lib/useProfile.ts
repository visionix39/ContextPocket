"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "contextpocket:name";
const DEFAULT = "Learner";
const EVENT = "contextpocket:profile";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Display name shown on the dashboard. Stored locally only. */
export function useProfile() {
  const name = useSyncExternalStore(subscribe, read, () => DEFAULT);

  const setName = useCallback((n: string) => {
    const clean = n.trim() || DEFAULT;
    try {
      window.localStorage.setItem(KEY, clean);
    } catch {
      /* private mode etc. */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { name, setName };
}
