import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicSettings } from './dynamic-settings';
import { WidgetRegistryService } from '../../_services/widget-registry.service';
import { SelectionService } from '../../_services/selection.service';
import { FormsModule } from '@angular/forms';

import { vi } from 'vitest';

describe('DynamicSettings', () => {
  let component: DynamicSettings;
  let fixture: ComponentFixture<DynamicSettings>;
  let mockRegistry: Pick<WidgetRegistryService, 'getPropsForWidget'>;
  let mockSelection: { updateProps: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRegistry = {
      getPropsForWidget: vi.fn().mockReturnValue([
        { id: 1, propKey: 'label', propType: 'string', defaultValue: 'Test' }
      ])
    };

    mockSelection = {
      updateProps: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DynamicSettings, FormsModule],
      providers: [
        { provide: WidgetRegistryService, useValue: mockRegistry },
        { provide: SelectionService, useValue: mockSelection }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicSettings);
    component = fixture.componentInstance;
    
    // Set inputs via Angular 18 ComponentRef
    fixture.componentRef.setInput('type', 'button');
    fixture.componentRef.setInput('props', { label: 'My Button' });
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render standard props from registry', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const label = compiled.querySelector('label');
    expect(label?.textContent?.trim()).toBe('label');
    
    const input = compiled.querySelector('input');
    expect(input?.value).toBe('My Button');
  });

  it('should call updateProps when input changes', () => {
    component.updateProp('label', 'New Value');
    expect(mockSelection.updateProps).toHaveBeenCalledWith({ label: 'New Value' });
  });
});
