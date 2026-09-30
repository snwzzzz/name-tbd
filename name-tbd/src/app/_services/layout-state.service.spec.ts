import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { LayoutStateService } from './layout-state.service';
import { UiComponentControllerService } from '../api/services/uiComponentController.service';
import { PageControllerService } from '../api/services/pageController.service';

describe('LayoutStateService', () => {
  let service: LayoutStateService;
  let uiService: { updateComponent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    uiService = { updateComponent: vi.fn().mockReturnValue(of({})) };
    const pageService = {
      getComponents1: vi.fn().mockReturnValue(of([
        { id: 1, type: 'button', x: 1, y: 1, w: 2, h: 1, props: { label: 'Stored' } },
      ])),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: UiComponentControllerService, useValue: uiService },
        { provide: PageControllerService, useValue: pageService },
      ],
    });
    service = TestBed.inject(LayoutStateService);
    service.loadLayoutForTab('7').subscribe();
  });

  it('should send the moved position, not the one still in the layout state', () => {
    service.updateComponent('7', { id: 1, type: 'button', x: 5, y: 3, w: 2, h: 1 }).subscribe();

    expect(uiService.updateComponent).toHaveBeenCalledWith(1, expect.objectContaining({ x: 5, y: 3, props: undefined }));
  });

  it('should keep prop edits local until saved explicitly', () => {
    service.patchItemProps('7', 1, { label: 'Edited' });
    expect(uiService.updateComponent).not.toHaveBeenCalled();

    service.updateComponent('7', service.getLayout('7')[0], true).subscribe();

    expect(uiService.updateComponent).toHaveBeenCalledWith(1, expect.objectContaining({ x: 1, props: { label: 'Edited' } }));
  });
});
