import { TestBed } from '@angular/core/testing';
import { ButtonWidget } from './button-widget';
import { WidgetEvent, WidgetEventsService } from '../../core/services/widget-events.service';
import { fakeApp, provideFakeApp } from '../../core/testing/fake-app';
import { CLICK_EVENT } from '../../_constants/widget-events.constants';

describe('ButtonWidget', () => {
  it('fires its click trigger, only while the app runs', () => {
    TestBed.configureTestingModule({ providers: provideFakeApp() });
    const fixture = TestBed.createComponent(ButtonWidget);
    fixture.componentRef.setInput('id', '3');
    fixture.componentRef.setInput('props', { label: 'Save' });
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const fired: WidgetEvent[] = [];
    TestBed.inject(WidgetEventsService).events$.subscribe((e) => fired.push(e));

    expect(button.textContent).toBe('Save');
    button.click();
    expect(fired).toEqual([]);

    fakeApp().session.start('page');
    button.click();
    expect(fired).toEqual([{ pageId: 'page', elementId: '3', event: CLICK_EVENT }]);
  });
});
