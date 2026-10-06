import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { VersionsService } from './versions.service';
import { SaveQueue } from './save-queue.service';
import { ToastService } from './toast.service';
import { EditorContext } from './editor-context.service';
import { VersionControlControllerService } from '../api/services/versionControlController.service';
import { VersionDto } from '../api/models';
import { PageControllerService } from '../api/services/pageController.service';
import { TabsService } from './tabs.service';
import { PagesStateService } from './pages-state.service';

describe('VersionsService', () => {
  let service: VersionsService;
  let calls: string[];
  let unsaved: boolean;
  let toasts: string[];
  const api = {
    getVersions: vi.fn(),
    saveVersion: vi.fn(),
    renameVersion: vi.fn(),
    restoreVersion: vi.fn(),
  };
  const version = (id: number, label = ''): VersionDto => ({ id, number: id, kind: 'MANUAL', label });

  beforeEach(() => {
    calls = [];
    unsaved = false;
    toasts = [];
    Object.values(api).forEach((fn) => fn.mockReset());
    TestBed.configureTestingModule({
      providers: [
        { provide: VersionControlControllerService, useValue: api },
        { provide: SaveQueue, useValue: { flush: async () => { calls.push('flush'); }, hasUnsaved: () => unsaved, state: signal('saved') } },
        { provide: ToastService, useValue: { show: (message: string) => toasts.push(message) } },
        // Page 7 (at /shop) is open; restored, it's page 30
        { provide: TabsService, useValue: { activeTabId: signal('7'), forgetSaved: () => calls.push('forget tabs') } },
        { provide: PagesStateService, useValue: { page: (id: number) => (id === 7 ? { id: 7, path: '/shop' } : undefined) } },
        { provide: PageControllerService, useValue: { getPages: () => of([{ id: 29, path: '/' }, { id: 30, path: '/shop' }]) } },
      ],
    });
    TestBed.inject(EditorContext).app.set({ id: 1, defaultBranchId: 5 });
    service = TestBed.inject(VersionsService);
    vi.spyOn(service, 'reload').mockImplementation((url) => calls.push(`reload ${url}`));
  });

  it('lists the branch’s versions', async () => {
    api.getVersions.mockReturnValue(of([version(2), version(1)]));
    await service.load();
    expect(api.getVersions).toHaveBeenCalledWith(5);
    expect(service.versions().map((v) => v.id)).toEqual([2, 1]);
  });

  it('sends the waiting changes before saving a version, and lists it first', async () => {
    service.versions.set([version(1)]);
    api.saveVersion.mockImplementation((body) => {
      calls.push('save');
      return of(version(2, body.label));
    });

    await service.save('Launch');

    expect(calls).toEqual(['flush', 'save']);
    expect(api.saveVersion).toHaveBeenCalledWith({ branchId: 5, label: 'Launch' });
    expect(service.versions().map((v) => v.id)).toEqual([2, 1]);
  });

  it('saves no version while changes couldn’t be sent (it would miss them)', async () => {
    unsaved = true;
    expect(await service.save('')).toBeNull();
    expect(api.saveVersion).not.toHaveBeenCalled();
    expect(toasts[0]).toContain('aren’t saved');
  });

  it('restores a version, then reloads the editor on the page at the same path (it has a new id)', async () => {
    api.restoreVersion.mockImplementation(() => {
      calls.push('restore');
      return of(undefined);
    });
    await service.restore(3);
    expect(calls).toEqual(['flush', 'restore', 'forget tabs', 'reload /apps/1/edit/30/edit']);
  });

  it('stays put when a restore fails, and says why', async () => {
    api.restoreVersion.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Version 3 was saved in an old format and can’t be opened' },
    })));
    await service.restore(3);
    expect(calls).toEqual(['flush']);
    expect(toasts).toEqual(['Version 3 was saved in an old format and can’t be opened']);
  });

  it('renames a version in the list', async () => {
    service.versions.set([version(1), version(2)]);
    api.renameVersion.mockReturnValue(of(version(2, 'Final')));
    await service.rename(2, 'Final');
    expect(service.versions().map((v) => v.label)).toEqual(['', 'Final']);
  });
});
