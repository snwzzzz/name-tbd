import { AppStorage } from './app-storage';

describe('AppStorage', () => {
  const table = { columns: ['name'], rows: [{ id: '0', values: ['Alice'] }] };

  it('keeps data for the same export only', () => {
    localStorage.clear();
    new AppStorage('key', 'r1').save({ 5: table });

    expect(new AppStorage('key', 'r1').load()).toEqual({ 5: table });
    expect(new AppStorage('key', 'r2').load()).toEqual({});
  });

  it('works without a usable storage', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } } as unknown as Storage;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = new AppStorage('key', 'r1', broken);

    expect(storage.load()).toEqual({});
    expect(() => storage.save({ 5: table })).not.toThrow();
    warn.mockRestore();
  });
});
