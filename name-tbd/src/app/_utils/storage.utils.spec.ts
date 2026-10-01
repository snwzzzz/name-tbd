import { TestBed } from '@angular/core/testing';
import { isOneOfOrNull, isWidthBetween, persistedSignal } from './storage.utils';

describe('persistedSignal', () => {
  const KEY = 'test-persisted';
  const isWidth = isWidthBetween(100, 500);

  const create = () => TestBed.runInInjectionContext(() => persistedSignal(KEY, 300, isWidth));

  beforeEach(() => localStorage.removeItem(KEY));

  it('starts with the fallback when nothing is saved', () => {
    expect(create()()).toBe(300);
  });

  it('saves changes and restores them', () => {
    const width = create();
    width.set(420);
    TestBed.tick();

    expect(localStorage.getItem(KEY)).toBe('420');
    expect(create()()).toBe(420);
  });

  it('falls back on invalid or unreadable saved values', () => {
    localStorage.setItem(KEY, '9000');
    expect(create()()).toBe(300);

    localStorage.setItem(KEY, '{not json');
    expect(create()()).toBe(300);
  });

  it('can restore null as a saved value', () => {
    localStorage.setItem(KEY, 'null');
    const tab = TestBed.runInInjectionContext(() => persistedSignal<string | null>(KEY, 'a', isOneOfOrNull(['a', 'b'])));

    expect(tab()).toBeNull();
  });
});
