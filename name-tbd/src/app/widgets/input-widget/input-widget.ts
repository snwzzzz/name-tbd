import { Component, DestroyRef, computed, inject } from '@angular/core';
import { LucideSearch } from '@lucide/angular';
import { BaseFieldWidget } from '../_shared/base-field-widget';
import { INPUT_EVENT } from '../../_constants/widget-events.constants';
import { propBool, propNumber } from '../../_utils/widget-props.utils';

export const INPUT_DEFAULT_DEBOUNCE_MS = 300;

/**
 * A text field. While the app runs, what's typed is kept for actions and forms to read
 * (InputValuesService), and its trigger fires once typing pauses for its debounce time, or at once
 * on Enter (see WIDGET_TRIGGERS). While editing it can't be typed in, so clicking it selects the widget.
 */
@Component({
  selector: 'app-input-widget',
  imports: [LucideSearch],
  templateUrl: './input-widget.html',
  styleUrl: './input-widget.scss',
})
export class InputWidget extends BaseFieldWidget {
  protected readonly kind = 'text';

  readonly placeholder = computed(() => this.text('placeholder') ?? '');
  readonly searchIcon = computed(() => propBool(this.props(), 'searchIcon', true));
  private readonly debounceMs = computed(() => Math.max(0, propNumber(this.props(), 'debounceMs', INPUT_DEFAULT_DEBOUNCE_MS)));

  private pending: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.cancelPending());
  }

  onInput(value: string): void {
    if (!this.session.live()) return;
    this.setValue(value, false);
    this.cancelPending();
    const delay = this.debounceMs();
    if (delay === 0) this.fireInput();
    else this.pending = setTimeout(() => this.fireInput(), delay);
  }

  /** Enter doesn't wait for the debounce. */
  onEnter(): void {
    if (!this.session.live()) return;
    this.cancelPending();
    this.fireInput();
  }

  private fireInput(): void {
    this.pending = null;
    this.fire(INPUT_EVENT);
  }

  private cancelPending(): void {
    if (this.pending !== null) clearTimeout(this.pending);
    this.pending = null;
  }
}
