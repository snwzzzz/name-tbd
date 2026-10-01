import { timeAgo } from './time.utils';

describe('timeAgo', () => {
  const now = new Date('2026-10-01T12:00:00').getTime();

  it('says how long ago, coarser the longer it is', () => {
    expect(timeAgo(now - 20_000, now)).toBe('just now');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3 h ago');
    expect(timeAgo(now - 26 * 3_600_000, now)).toBe('yesterday');
    expect(timeAgo(now - 3 * 86_400_000, now)).toBe('3 days ago');
    expect(timeAgo(now - 30 * 86_400_000, now)).toBe(new Date(now - 30 * 86_400_000).toLocaleDateString());
  });
});
