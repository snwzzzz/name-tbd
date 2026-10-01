import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { PanelPage } from './panel-page';
import { DataSourceStateService } from '../../_services/data-source-state.service';

describe('PanelPage', () => {
  const mount = (tabId: string) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ tabId })), queryParamMap: of(convertToParamMap({})) },
        },
        {
          provide: DataSourceStateService,
          useValue: {
            sources: signal([]), loading: signal(false), loaded: signal(true), error: signal(null),
            details: signal({}), ensureLoaded: () => {}, ensureDetails: () => {},
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PanelPage);
    fixture.detectChanges();
    return fixture;
  };

  it('shows the Data Manager (loaded on demand) for the Data panel', async () => {
    const fixture = mount('panel-data');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-data-manager')).not.toBeNull();
  });

  it("refuses panels that can't be opened in a tab (like Components)", () => {
    expect(mount('panel-components').nativeElement.textContent).toContain("can't be opened in a tab");
  });
});
