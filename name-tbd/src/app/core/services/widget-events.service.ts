import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** An event a widget fired on a previewed page. */
export interface WidgetEvent {
  pageId: string;
  elementId: string;
  event: string;
}

/**
 * Widgets announce their events here (e.g. a table row double-click); the canvas runs the flows
 * they trigger. Keeps widgets independent of the workflow runtime.
 */
@Injectable({ providedIn: 'root' })
export class WidgetEventsService {
  private readonly events = new Subject<WidgetEvent>();
  readonly events$ = this.events.asObservable();

  fire(event: WidgetEvent): void {
    this.events.next(event);
  }
}
