import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HistoryPanel } from './history-panel';
import { VersionsService } from '../../_services/versions.service';
import { ModalService } from '../../_services/modal/modal.service';
import { VersionDto } from '../../api/models';

describe('HistoryPanel', () => {
  const versions = signal<VersionDto[]>([]);
  const state = {
    versions,
    loading: signal(false),
    error: signal<string | null>(null),
    busy: signal(false),
    load: vi.fn(async () => undefined),
    save: vi.fn(async () => ({ id: 9 })),
    rename: vi.fn(async () => undefined),
    restore: vi.fn(async () => undefined),
    preview: vi.fn(),
  };
  let confirmed: boolean;

  beforeEach(() => {
    confirmed = true;
    Object.values(state).forEach((v) => typeof v === 'function' && 'mockClear' in v && v.mockClear());
    versions.set([
      { id: 2, number: 2, kind: 'AUTO', createdAt: new Date(), author: 'Ada' },
      { id: 1, number: 1, kind: 'MANUAL', label: 'Launch', author: 'Ada' },
    ]);
    TestBed.configureTestingModule({
      imports: [HistoryPanel],
      providers: [
        { provide: VersionsService, useValue: state },
        { provide: ModalService, useValue: { confirm: async () => confirmed } },
      ],
    });
  });

  const render = async () => {
    const fixture = TestBed.createComponent(HistoryPanel);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('lists the versions by name, or by why they were made', async () => {
    const el: HTMLElement = (await render()).nativeElement;
    expect(state.load).toHaveBeenCalled();
    expect([...el.querySelectorAll('.name')].map((n) => n.textContent?.trim())).toEqual(['Automatic', 'Launch']);
    expect(el.querySelector('.meta')?.textContent).toContain('just now · Ada');
  });

  it('saves a version with the name typed', async () => {
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('.save input')!;
    input.value = ' Before launch ';
    input.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('.save')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(state.save).toHaveBeenCalledWith('Before launch');
    expect(fixture.componentInstance.newLabel()).toBe('');
  });

  it('restores a version only once confirmed', async () => {
    const fixture = await render();
    const restore = () => fixture.nativeElement.querySelector('[aria-label="Restore version 1"]').click();

    confirmed = false;
    restore();
    await fixture.whenStable();
    expect(state.restore).not.toHaveBeenCalled();

    confirmed = true;
    restore();
    await fixture.whenStable();
    expect(state.restore).toHaveBeenCalledWith(1);
  });

  it('renames a version in place', async () => {
    const fixture = await render();
    fixture.nativeElement.querySelector('[aria-label="Rename version 1"]').click();
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.rename');
    expect(input.value).toBe('Launch');

    input.value = 'Launched';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();

    expect(state.rename).toHaveBeenCalledWith(1, 'Launched');
  });
});
