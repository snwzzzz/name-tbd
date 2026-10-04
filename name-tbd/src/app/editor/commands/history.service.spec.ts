import { TestBed } from '@angular/core/testing';
import { GROUP_MS, HISTORY_LIMIT, HistoryService } from './history.service';
import { Command, CommandContext } from './command';
import { MoveWidgets } from './widget-commands';
import { LayoutStateService } from '../../_services/layout-state.service';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { SaveQueue } from '../../_services/save-queue.service';
import { PageControllerService } from '../../api/services/pageController.service';
import { WorkflowControllerService } from '../../api/services/workflowController.service';

/** A command that writes what it does into a log. */
class Logged implements Command {
  constructor(readonly pageId: string, readonly label: string, private readonly log: string[], private readonly inverse = false) {}

  apply(_context: CommandContext): void {
    this.log.push(`${this.inverse ? 'undo' : 'do'} ${this.label}`);
  }

  invert(): Command {
    return new Logged(this.pageId, this.label, this.log, !this.inverse);
  }
}

describe('HistoryService', () => {
  let history: HistoryService;
  let log: string[];
  let now: number;

  beforeEach(() => {
    log = [];
    now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    TestBed.configureTestingModule({
      providers: [
        { provide: PageControllerService, useValue: {} },
        { provide: WorkflowControllerService, useValue: {} },
        { provide: SaveQueue, useValue: { enqueue: () => undefined } },
        { provide: LayoutStateService, useValue: { placeWidgets: () => log.push('undo Move') } },
        { provide: WorkflowStateService, useValue: {} },
      ],
    });
    history = TestBed.inject(HistoryService);
  });

  afterEach(() => vi.restoreAllMocks());

  const record = (label: string, pageId = '7') => {
    now += GROUP_MS * 2;
    history.record(new Logged(pageId, label, log));
  };

  it('undoes and redoes the steps of a page, in order', () => {
    const applied: string[] = [];
    history.applied$.subscribe((pageId) => applied.push(pageId));
    record('A');
    record('B');
    expect(history.undoLabel('7')).toBe('B');

    history.undo('7');
    history.undo('7');
    history.undo('7'); // nothing left
    history.redo('7');

    expect(log).toEqual(['undo B', 'undo A', 'do A']);
    expect(history.undoLabel('7')).toBe('A');
    expect(history.redoLabel('7')).toBe('B');
    expect(applied).toEqual(['7', '7', '7']);
  });

  it('keeps each page its own steps', () => {
    record('A', '7');
    record('B', '8');
    history.undo('7');
    expect(log).toEqual(['undo A']);
    expect(history.undoLabel('8')).toBe('B');
  });

  it('forgets what could be redone once something new is done', () => {
    record('A');
    history.undo('7');
    record('B');
    expect(history.redoLabel('7')).toBeNull();
  });

  it('makes steps recorded together one step, named after what is not a move', () => {
    record('Add widget');
    now += 10;
    history.record(new MoveWidgets('7', [{ id: 2, x: 0, y: 0, w: 4, h: 4 }], [{ id: 2, x: 0, y: 0, w: 4, h: 6 }]));
    expect(history.undoLabel('7')).toBe('Add widget');

    history.undo('7');
    expect(history.undoLabel('7')).toBeNull();
    // Taken back in reverse: the container's growth, then the drop
    expect(log).toEqual(['undo Move', 'undo Add widget']);
  });

  it('keeps the last 100 steps', () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) record(`S${i}`);
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) history.undo('7');
    expect(log).toHaveLength(HISTORY_LIMIT);
    expect(log.at(-1)).toBe('undo S5');
  });
});
