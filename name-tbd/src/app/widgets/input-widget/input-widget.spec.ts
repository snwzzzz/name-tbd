import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { InputWidget } from './input-widget';
import { WidgetEvent, WidgetEventsService } from '../../core/services/widget-events.service';
import { InputValuesService } from '../../core/services/input-values.service';
import { fakeApp, provideFakeApp } from '../../core/testing/fake-app';
import { INPUT_EVENT } from '../../_constants/widget-events.constants';
import { WidgetProps } from '../../_types/layout.types';

describe('InputWidget', () => {
  const mount = (props: WidgetProps = {}) => {
    TestBed.configureTestingModule({ providers: provideFakeApp() });
    const fixture = TestBed.createComponent(InputWidget);
    fixture.componentRef.setInput('id', '4');
    fixture.componentRef.setInput('props', { placeholder: 'Search…', ...props });
    fixture.detectChanges();
    const fired: WidgetEvent[] = [];
    TestBed.inject(WidgetEventsService).events$.subscribe((e) => fired.push(e));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    return { fixture, input, fired, type };
  };

  afterEach(() => vi.useRealTimers());

  it('is read-only while editing: typing is neither kept nor fires', () => {
    const { input, fired, type } = mount();

    expect(input.readOnly).toBe(true);
    expect(input.placeholder).toBe('Search…');
    type('abc');
    expect(TestBed.inject(InputValuesService).value('4')).toBe('');
    expect(fired).toEqual([]);
  });

  it('keeps what is typed and fires once typing pauses for its debounce time', () => {
    vi.useFakeTimers();
    const { fixture, fired, type } = mount({ debounceMs: '300' });
    fakeApp().session.start('page');
    fixture.detectChanges();

    type('an');
    vi.advanceTimersByTime(200);
    type('anna');
    expect(TestBed.inject(InputValuesService).value('4')).toBe('anna');
    vi.advanceTimersByTime(299);
    expect(fired).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(fired).toEqual([{ pageId: 'page', elementId: '4', event: INPUT_EVENT }]);
  });

  it('fires at once on Enter, without firing again after the debounce', () => {
    vi.useFakeTimers();
    const { fixture, input, fired, type } = mount({ debounceMs: '500' });
    fakeApp().session.start('page');
    fixture.detectChanges();

    type('bob');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fired.length).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(fired.length).toBe(1);
  });
});
