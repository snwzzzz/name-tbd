import { TestBed } from '@angular/core/testing';
import { WidgetRegistryService } from './widget-registry.service';

describe('WidgetRegistryService', () => {
  it('lists the global settings, then the widget type\'s own, from the catalog', () => {
    const props = TestBed.inject(WidgetRegistryService).getPropsForWidget('button');

    expect(props.map((p) => p.propKey)).toEqual(['x', 'y', 'w', 'h', 'label', 'color']);
    expect(props.find((p) => p.propKey === 'label')).toMatchObject({ widgetType: 'button', label: 'Label', defaultValue: 'Click Me' });
  });

  it('has only the global settings for unknown types', () => {
    expect(TestBed.inject(WidgetRegistryService).getPropsForWidget('nope').map((p) => p.propKey)).toEqual(['x', 'y', 'w', 'h']);
  });
});
