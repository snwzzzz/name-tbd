import { Component, computed, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_SESSION } from '../../core/ports/app-ports';
import { WidgetEventsService } from '../../core/services/widget-events.service';
import { CLICK_EVENT } from '../../_constants/widget-events.constants';

/** A button; clicking it while the app runs fires its click trigger (see WIDGET_TRIGGERS). */
@Component({
  selector: 'app-button-widget',
  templateUrl: './button-widget.html',
  styleUrl: './button-widget.scss',
  host: { '(click)': 'onClick()', '[class.live]': 'session.live()' },
})
export class ButtonWidget extends BaseWidget {
  protected readonly session = inject(APP_SESSION);
  private readonly widgetEvents = inject(WidgetEventsService);

  readonly label = computed(() => this.text('label') ?? 'Button');
  readonly color = computed(() => this.text('color') ?? '#3b82f6');

  onClick(): void {
    const pageId = this.session.pageId();
    if (this.session.live() && pageId) this.widgetEvents.fire({ pageId, elementId: this.id(), event: CLICK_EVENT });
  }
}
