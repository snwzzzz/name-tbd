import { ComponentId } from '../_types/layout.types';

/** Saved components have numeric ids; unsaved ones still carry a temporary string id. */
export const isSavedId = (id: ComponentId | null | undefined): id is number => typeof id === 'number';

/** Numeric ids (also when they come as strings, e.g. from DOM attributes) become numbers. */
export function toComponentId(raw: ComponentId | null | undefined): ComponentId | undefined {
  if (raw == null || raw === '') return undefined;
  return !isNaN(Number(raw)) ? Number(raw) : raw;
}

/** A unique id for a widget that hasn't been saved yet. */
export const newTemporaryId = (): string => `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
