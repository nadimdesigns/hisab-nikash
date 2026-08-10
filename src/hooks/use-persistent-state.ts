import { useEffect, useState } from "react";

/**
 * Like useState, but persists the value in localStorage under the given key.
 * Falls back to `initial` when storage is unavailable, missing, or malformed.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  validate?: (v: unknown) => v is T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed = JSON.parse(raw);
      if (validate && !validate(parsed)) return initial;
      return parsed as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [key, value]);

  return [value, setValue];
}
