import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicSettingsComponent } from './dynamic-settings.component';
import { WidgetRegistryService } from '../../core/widget-registry.service';
import { SelectionService } from '../../services/selection.service';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';

import { vi } from 'vitest';

describe('DynamicSettingsComponent', () => {
  let component: DynamicSettingsComponent;
  let fixture: ComponentFixture<DynamicSettingsComponent>;
  let mockRegistry: any;
  let mockSelection: any;

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
      imports: [DynamicSettingsComponent, FormsModule],
      providers: [
        { provide: WidgetRegistryService, useValue: mockRegistry },
        { provide: SelectionService, useValue: mockSelection }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicSettingsComponent);
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
