import { Component, computed, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_SESSION } from '../../core/ports/app-ports';
import { WidgetEventsService } from '../../core/services/widget-events.service';
import { FormsService } from '../../core/forms/forms.service';
import { CLICK_EVENT } from '../../_constants/widget-events.constants';

/** Auto: the app theme's primary color. */
export const BUTTON_DEFAULT_COLOR = 'var(--widget-brand)';

/**
 * A button; clicking it while the app runs fires its click trigger (see WIDGET_TRIGGERS). In a
 * form it also submits the form (or empties it), as its "In a form" setting says.
 */
@Component({
  selector: 'app-button-widget',
  templateUrl: './button-widget.html',
  styleUrl: './button-widget.scss',
  host: { '(click)': 'onClick()', '[class.live]': 'session.live()' },
})
export class ButtonWidget extends BaseWidget {
  protected readonly session = inject(APP_SESSION);
  private readonly widgetEvents = inject(WidgetEventsService);
  private readonly forms = inject(FormsService);

  readonly label = computed(() => this.text('label') ?? 'Button');
  readonly color = computed(() => this.text('color') ?? BUTTON_DEFAULT_COLOR);
  readonly variant = computed(() => (this.text('variant') ?? 'Filled').toLowerCase());

  onClick(): void {
    const pageId = this.session.pageId();
    if (!this.session.live() || !pageId) return;
    const action = this.text('formAction') ?? 'Submit';
    const form = action === 'Nothing' ? null : this.forms.formOf(pageId, this.id());
    if (form && action === 'Reset') this.forms.reset(pageId, String(form.id));
    if (form && action === 'Submit') void this.forms.submit(pageId, String(form.id));
    this.widgetEvents.fire({ pageId, elementId: this.id(), event: CLICK_EVENT });
  }
}
