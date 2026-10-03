import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApplicationConsole } from './console';
import { ApplicationControllerService } from '../../api/services/applicationController.service';
import { ApplicationDto, WorkspaceMembershipDto } from '../../api/models';
import { AuthService } from '../../_services/auth.service';
import { ModalService } from '../../_services/modal/modal.service';

describe('ApplicationConsole', () => {
  let apps: Observable<ApplicationDto[]>;
  let calls: unknown[][];
  let navigated: unknown[];
  let formResult: unknown;
  let confirmResult: boolean;
  const workspaces = signal<WorkspaceMembershipDto[]>([]);

  const mount = () => {
    TestBed.configureTestingModule({
      imports: [ApplicationConsole],
      providers: [
        provideRouter([]),
        {
          provide: ApplicationControllerService,
          useValue: {
            getApplications: () => apps,
            createApplication: (command: unknown) => {
              calls.push(['create', command]);
              return of({ id: 42, title: 'New' });
            },
            updateApplication: (id: number, command: { title: string }) => {
              calls.push(['update', id, command]);
              return of({ id, title: command.title });
            },
            duplicateApplication: (id: number) => {
              calls.push(['duplicate', id]);
              return of({ id: 50, title: 'Shop (copy)' });
            },
            deleteApplication: (id: number) => {
              calls.push(['delete', id]);
              return of(null);
            },
          },
        },
        { provide: AuthService, useValue: { workspaces, user: signal(null) } },
        {
          provide: ModalService,
          useValue: {
            open: () => {
              const closed = new Subject<unknown>();
              setTimeout(() => {
                closed.next(formResult);
                closed.complete();
              });
              return { afterClosed: () => closed };
            },
            confirm: async () => confirmResult,
          },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(async (url) => {
      navigated.push(url);
      return true;
    });
    const fixture = TestBed.createComponent(ApplicationConsole);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    calls = [];
    navigated = [];
    formResult = undefined;
    confirmResult = false;
    workspaces.set([
      { id: 9, name: 'Team', personal: false, role: 'VIEWER' },
      { id: 1, name: 'Personal', personal: true, role: 'OWNER' },
    ]);
    apps = of([
      { id: 5, title: 'Shop' },
      { id: 6, title: 'Blog' },
    ]);
  });

  it('lists the applications', () => {
    const page = mount().nativeElement as HTMLElement;
    expect([...page.querySelectorAll('.title')].map((t) => t.textContent)).toEqual(['Shop', 'Blog']);
  });

  it('invites to create the first application when there is none', () => {
    apps = of([]);
    const page = mount().nativeElement as HTMLElement;
    expect(page.querySelector('.empty')?.textContent).toContain('No applications yet');
  });

  it('offers to try again when loading fails', () => {
    apps = throwError(() => new Error('down'));
    const page = mount().nativeElement as HTMLElement;
    expect(page.querySelector('[role=alert]')?.textContent).toContain("couldn't be loaded");
  });

  it('creates an application in the personal workspace and opens it', async () => {
    const console = mount().componentInstance;
    formResult = { title: 'Shop 2', description: '' };

    await console.create();
    await new Promise((resolve) => setTimeout(resolve));

    expect(calls).toEqual([['create', { workspaceId: 1, title: 'Shop 2', description: '' }]]);
    expect(navigated).toEqual([['/apps', 42, 'edit']]);
  });

  it('renames an application', async () => {
    const fixture = mount();
    formResult = { title: 'Store', description: '' };

    await fixture.componentInstance.rename({ id: 5, title: 'Shop' });
    fixture.detectChanges();

    expect(calls).toEqual([['update', 5, { title: 'Store', description: '' }]]);
    expect(fixture.componentInstance.applications().map((a) => a.title)).toEqual(['Store', 'Blog']);
  });

  it('duplicates an application, the copy right after it', () => {
    const fixture = mount();

    fixture.componentInstance.duplicate({ id: 5, title: 'Shop' });

    expect(calls).toEqual([['duplicate', 5]]);
    expect(fixture.componentInstance.applications().map((a) => a.title)).toEqual(['Shop', 'Shop (copy)', 'Blog']);
  });

  it('deletes only after confirmation', async () => {
    const fixture = mount();

    await fixture.componentInstance.remove({ id: 5, title: 'Shop' });
    expect(calls).toEqual([]);

    confirmResult = true;
    await fixture.componentInstance.remove({ id: 5, title: 'Shop' });
    expect(calls).toEqual([['delete', 5]]);
    expect(fixture.componentInstance.applications().map((a) => a.title)).toEqual(['Blog']);
  });

  it('offers no creating to users who may only view', () => {
    workspaces.set([{ id: 9, name: 'Team', personal: false, role: 'VIEWER' }]);
    const page = mount().nativeElement as HTMLElement;
    expect(page.querySelector('.header-actions app-button')).toBeNull();
  });
});
