import { TestBed } from '@angular/core/testing';
import { WidgetRegistryService } from './widget-registry.service';

describe('WidgetRegistryService', () => {
  it("lists the widget type's settings from the catalog, without position and size", () => {
    const props = TestBed.inject(WidgetRegistryService).getPropsForWidget('button');

    expect(props.map((p) => p.propKey)).toEqual(['label', 'color', 'textSize']);
    expect(props.find((p) => p.propKey === 'label')).toMatchObject({ widgetType: 'button', label: 'Label', defaultValue: 'Click Me' });
  });

  it('has no settings for unknown types', () => {
    expect(TestBed.inject(WidgetRegistryService).getPropsForWidget('nope')).toEqual([]);
  });
});
