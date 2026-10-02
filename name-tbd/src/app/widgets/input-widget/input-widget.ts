import { Component, DestroyRef, computed, inject } from '@angular/core';
import { LucideSearch } from '@lucide/angular';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_SESSION } from '../../core/ports/app-ports';
import { InputValuesService } from '../../core/services/input-values.service';
import { WidgetEventsService } from '../../core/services/widget-events.service';
import { INPUT_EVENT } from '../../_constants/widget-events.constants';
import { propBool, propNumber } from '../../_utils/widget-props.utils';

export const INPUT_DEFAULT_DEBOUNCE_MS = 300;

/**
 * A text field. While the app runs, what's typed is kept for actions to read (InputValuesService),
 * and its trigger fires once typing pauses for its debounce time, or at once on Enter (see
 * WIDGET_TRIGGERS). While editing it can't be typed in, so clicking it selects the widget.
 */
@Component({
  selector: 'app-input-widget',
  imports: [LucideSearch],
  templateUrl: './input-widget.html',
  styleUrl: './input-widget.scss',
  host: { '[class.live]': 'session.live()' },
})
export class InputWidget extends BaseWidget {
  protected readonly session = inject(APP_SESSION);
  private readonly values = inject(InputValuesService);
  private readonly widgetEvents = inject(WidgetEventsService);

  readonly label = computed(() => this.text('label'));
  readonly placeholder = computed(() => this.text('placeholder') ?? '');
  readonly searchIcon = computed(() => propBool(this.props(), 'searchIcon', true));
  private readonly debounceMs = computed(() => Math.max(0, propNumber(this.props(), 'debounceMs', INPUT_DEFAULT_DEBOUNCE_MS)));
  readonly value = computed(() => this.values.value(this.id()));

  private pending: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.cancelPending());
  }

  onInput(value: string): void {
    if (!this.session.live()) return;
    this.values.set(this.id(), value);
    this.cancelPending();
    const delay = this.debounceMs();
    if (delay === 0) this.fire();
    else this.pending = setTimeout(() => this.fire(), delay);
  }

  /** Enter doesn't wait for the debounce. */
  onEnter(): void {
    if (!this.session.live()) return;
    this.cancelPending();
    this.fire();
  }

  private fire(): void {
    this.pending = null;
    const pageId = this.session.pageId();
    if (this.session.live() && pageId) this.widgetEvents.fire({ pageId, elementId: this.id(), event: INPUT_EVENT });
  }

  private cancelPending(): void {
    if (this.pending !== null) clearTimeout(this.pending);
    this.pending = null;
  }
}
