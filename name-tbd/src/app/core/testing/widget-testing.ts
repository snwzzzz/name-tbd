import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { WidgetProps } from '../../_types/layout.types';
import { WidgetEvent, WidgetEventsService } from '../services/widget-events.service';
import { FakeAppOptions, fakeApp, provideFakeApp } from './fake-app';

/** A widget mounted on a fake app (specs only): its element, the events it fires, and a way to go live. */
export interface MountedWidget<T extends BaseWidget> {
  fixture: ComponentFixture<T>;
  el: HTMLElement;
  fired: WidgetEvent[];
  /** Runs the app (on page 'page'), as the preview and the export do. */
  goLive(): void;
  setProps(props: WidgetProps): void;
}

export function mountWidget<T extends BaseWidget>(component: Type<T>, props: WidgetProps = {}, options: FakeAppOptions = {}, id = '7'): MountedWidget<T> {
  TestBed.configureTestingModule({ providers: provideFakeApp(options) });
  const fixture = TestBed.createComponent(component);
  fixture.componentRef.setInput('id', id);
  fixture.componentRef.setInput('props', props);
  fixture.detectChanges();
  const fired: WidgetEvent[] = [];
  TestBed.inject(WidgetEventsService).events$.subscribe((e) => fired.push(e));
  return {
    fixture,
    el: fixture.nativeElement,
    fired,
    goLive: () => {
      fakeApp().session.start('page');
      fixture.detectChanges();
    },
    setProps: (next) => {
      fixture.componentRef.setInput('props', next);
      fixture.detectChanges();
    },
  };
}
