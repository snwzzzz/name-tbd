import { WritableSignal, effect, signal } from '@angular/core';

/**
 * A signal whose value is saved in localStorage under `key` and restored from it, e.g. to keep UI
 * preferences across reloads. A missing, unreadable, or invalid saved value falls back to
 * `fallback`. Must be called in an injection context (it registers an effect).
 */
export function persistedSignal<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): WritableSignal<T> {
  const state = signal<T>(restore(key, fallback, isValid));
  effect(() => {
    const value = state();
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode, quota): the value just won't survive a reload
    }
  });
  return state;
}

function restore<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    const value: unknown = JSON.parse(saved);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Validator for a width in pixels within [min, max]. */
export const isWidthBetween =
  (min: number, max: number) =>
  (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/** Validator for one of the given ids, or null (nothing selected / collapsed). */
export const isOneOfOrNull =
  <T>(ids: readonly T[]) =>
  (value: unknown): value is T | null =>
    value === null || ids.includes(value as T);
