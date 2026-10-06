import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { SAVE_IDLE_MS, SAVE_MAX_WAIT_MS, SaveQueue } from './save-queue.service';
import { IdRegistry } from './id-registry.service';
import { BranchControllerService } from '../api/services/branchController.service';
import { ChangeBatchCommand, ChangeBatchResultDto, ChangeOperation } from '../api/models';
import { provideTestEditorContext, TEST_APP } from '../_testing/editor-context.testing';
import { toApiProps } from '../_utils/api-mapper.utils';

describe('SaveQueue', () => {
  let sent: { branchId: number; changes: ChangeOperation[] }[];
  let answer: (changes: ChangeOperation[]) => Observable<ChangeBatchResultDto>;
  let queue: SaveQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    answer = () => of({ ids: {} });
    TestBed.configureTestingModule({
      providers: [
        provideTestEditorContext(),
        {
          provide: BranchControllerService,
          useValue: {
            applyChanges: (branchId: number, command: ChangeBatchCommand) => {
              sent.push({ branchId, changes: command.changes ?? [] });
              return answer(command.changes ?? []);
            },
          },
        },
      ],
    });
    queue = TestBed.inject(SaveQueue);
  });

  afterEach(() => vi.useRealTimers());

  const move = (id: number | string, x: number): ChangeOperation =>
    typeof id === 'number' ? { op: 'updateWidget', id, x, y: 0, w: 2, h: 1, parentId: -1 } : { op: 'updateWidget', ref: id, x, y: 0, w: 2, h: 1, parentId: -1 };

  it('sends a second after the last change, to the open branch, once', async () => {
    queue.enqueue(move(1, 1));
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS - 100);
    queue.enqueue(move(2, 1));
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS - 100);
    expect(sent).toEqual([]);
    expect(queue.state()).toBe('pending');

    await vi.advanceTimersByTimeAsync(100);

    expect(sent).toHaveLength(1);
    expect(sent[0].branchId).toBe(TEST_APP.defaultBranchId);
    expect(queue.state()).toBe('saved');
    expect(queue.hasUnsaved()).toBe(false);
  });

  it('sends at the latest 15 seconds after the first change, however long the editing goes on', async () => {
    for (let t = 0; t < SAVE_MAX_WAIT_MS; t += 500) {
      queue.enqueue(move(1, t));
      await vi.advanceTimersByTimeAsync(500);
    }
    expect(sent).toHaveLength(1);
  });

  it('merges changes to the same thing: the last place of a widget, an update into its create', async () => {
    queue.enqueue({ op: 'createWidget', ref: 'new_a', pageId: 7, type: 'label', x: 0, y: 0, w: 2, h: 1, props: {} });
    for (let x = 1; x <= 10; x++) queue.enqueue(move(1, x));
    queue.enqueue(move('new_a', 5));
    queue.enqueue({ op: 'updateWidget', ref: 'new_a', props: toApiProps({ text: 'Hi' }) });

    await queue.flush();

    expect(sent[0].changes).toEqual([
      { op: 'createWidget', ref: 'new_a', pageId: 7, type: 'label', x: 5, y: 0, w: 2, h: 1, props: { text: 'Hi' }, parentId: -1, parentRef: undefined },
      { op: 'updateWidget', id: 1, x: 10, y: 0, w: 2, h: 1, parentId: -1 },
    ]);
  });

  it('does not merge an update across a create it could point at', async () => {
    queue.enqueue(move(1, 1));
    queue.enqueue({ op: 'createWidget', ref: 'new_box', pageId: 7, type: 'container', x: 0, y: 0, w: 6, h: 4, props: {} });
    queue.enqueue({ op: 'updateWidget', id: 1, x: 0, y: 0, w: 2, h: 1, parentRef: 'new_box' });

    await queue.flush();

    expect(sent[0].changes.map((c) => c.op)).toEqual(['updateWidget', 'createWidget', 'updateWidget']);
  });

  it('drops waiting updates of something deleted', async () => {
    queue.enqueue(move(1, 1));
    queue.enqueue({ op: 'updateWidget', id: 1, props: toApiProps({ text: 'x' }) });
    queue.enqueue({ op: 'deleteWidget', id: 1 });

    await queue.flush();

    expect(sent[0].changes).toEqual([{ op: 'deleteWidget', id: 1 }]);
  });

  it('records the ids things got, and sends later changes to them by those ids', async () => {
    const registry = TestBed.inject(IdRegistry);
    const mapped: ReadonlyMap<string, number>[] = [];
    registry.mapped$.subscribe((ids) => mapped.push(ids));
    answer = () => of({ ids: { new_btn: 50 } });

    queue.enqueue({ op: 'createWidget', ref: 'new_btn', pageId: 7, type: 'button', x: 0, y: 0, w: 2, h: 1, props: {} });
    const sending = queue.flush();
    // Made while the batch is on its way: still pointing at the temporary id
    queue.enqueue(move('new_btn', 3));
    queue.enqueue({ op: 'createNode', ref: 'new_t', workflowId: 9, type: 'Trigger', x: 0, y: 0,
      props: toApiProps({ triggerType: 'element_click', elementId: 'new_btn' }) });
    await sending;
    answer = () => of({ ids: {} });
    await queue.flush();

    expect(mapped).toEqual([new Map([['new_btn', 50]])]);
    expect(registry.resolve('new_btn')).toBe(50);
    expect(sent[1].changes).toEqual([
      { op: 'updateWidget', id: 50, x: 3, y: 0, w: 2, h: 1, parentId: -1 },
      { op: 'createNode', ref: 'new_t', workflowId: 9, type: 'Trigger', x: 0, y: 0, props: { triggerType: 'element_click', elementId: '50' } },
    ]);

    // And so are changes made after it's known
    queue.enqueue(move('new_btn', 4));
    await queue.flush();
    expect(sent[2].changes).toEqual([move(50, 4)]);
  });

  it('keeps the changes and tries again while the backend cannot be reached', async () => {
    answer = () => throwError(() => new HttpErrorResponse({ status: 0 }));
    queue.enqueue(move(1, 1));
    await queue.flush();
    expect(queue.state()).toBe('offline');
    expect(queue.hasUnsaved()).toBe(true);

    queue.enqueue(move(2, 1));
    answer = () => of({ ids: {} });
    await vi.advanceTimersByTimeAsync(2000);

    expect(sent).toHaveLength(2);
    expect(sent[1].changes.map((c) => c.id)).toEqual([1, 2]);
    expect(queue.state()).toBe('saved');
  });

  it('says so when the backend refuses the changes', async () => {
    answer = () => throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Change 1 (updateWidget): gone', index: 0 } }));
    queue.enqueue(move(1, 1));
    await queue.flush();

    expect(queue.state()).toBe('error');
    expect(queue.error()).toContain('gone');
    expect(queue.hasUnsaved()).toBe(false);
  });

  it('sends right away when the editor goes into the background', async () => {
    queue.enqueue(move(1, 1));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    expect(sent).toHaveLength(1);
  });

  it('editing a page with 50 widgets for a minute sends fewer than 5 requests', async () => {
    const widgets = Array.from({ length: 50 }, (_, i) => i + 1);
    // Drags (several widgets move as containers grow), typing into props, now and then a new widget
    for (let ms = 0; ms < 60_000; ms += 100) {
      const id = widgets[(ms / 100) % widgets.length];
      if (ms % 300 === 0) queue.enqueue(move(id, ms));
      if (ms % 200 === 0) queue.enqueue({ op: 'updateWidget', id: widgets[ms % 7], props: toApiProps({ text: `t${ms}` }) });
      if (ms % 20_000 === 0) queue.enqueue({ op: 'createWidget', ref: `new_${ms}`, pageId: 7, type: 'label', x: 0, y: 0, w: 1, h: 1, props: {} });
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(sent.length).toBeLessThan(5);
  });
});
