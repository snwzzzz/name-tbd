import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AUTOSAVE_DELAY_MS, PropsAutosaveService } from './props-autosave.service';
import { LayoutStateService } from './layout-state.service';
import { LayoutItem } from '../_types/layout.types';

describe('PropsAutosaveService', () => {
  let saved: LayoutItem[];
  let respond: () => Observable<unknown>;
  const layout: LayoutItem[] = [{ id: 4, type: 'label', props: { text: 'Hi' } }, { id: 'item-tmp', type: 'label' }];

  beforeEach(() => {
    vi.useFakeTimers();
    saved = [];
    respond = () => of({});
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LayoutStateService,
          useValue: {
            getLayout: () => layout,
            updateComponent: (_page: string, item: LayoutItem) => {
              saved.push(item);
              return respond();
            },
          },
        },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('saves once the edits pause, one save for many quick edits', async () => {
    const autosave = TestBed.inject(PropsAutosaveService);
    autosave.schedule('1', '4');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS / 2);
    autosave.schedule('1', '4');
    expect(autosave.state()).toBe('unsaved');
    expect(autosave.hasUnsaved()).toBe(true);

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    expect(saved.map((i) => i.id)).toEqual([4]);
    expect(autosave.state()).toBe('saved');
    expect(autosave.hasUnsaved()).toBe(false);
  });

  it('saves right away on flush (Ctrl+S)', async () => {
    const autosave = TestBed.inject(PropsAutosaveService);
    autosave.schedule('1', '4');
    await autosave.flush();

    expect(saved.length).toBe(1);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);
    expect(saved.length).toBe(1);
  });

  it('keeps failed edits as unsaved until a retry works', async () => {
    const autosave = TestBed.inject(PropsAutosaveService);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respond = () => throwError(() => new Error('offline'));
    autosave.schedule('1', '4');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    expect(autosave.state()).toBe('error');
    expect(autosave.hasUnsaved()).toBe(true);

    respond = () => of({});
    await autosave.flush();
    expect(autosave.state()).toBe('saved');
  });

  it('skips widgets that are gone or not created yet', async () => {
    const autosave = TestBed.inject(PropsAutosaveService);
    autosave.schedule('1', 'item-tmp');
    autosave.schedule('1', '99');
    await autosave.flush();

    expect(saved).toEqual([]);
    expect(autosave.hasUnsaved()).toBe(false);
  });

  it('warns before leaving while something is unsaved', () => {
    const autosave = TestBed.inject(PropsAutosaveService);
    const leave = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(leave()).toBe(false);
    autosave.schedule('1', '4');
    expect(leave()).toBe(true);
  });
});
