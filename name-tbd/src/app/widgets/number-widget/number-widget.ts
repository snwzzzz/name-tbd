import { Component, computed } from '@angular/core';
import { BaseFieldWidget } from '../_shared/base-field-widget';
import { CHANGE_EVENT } from '../../_constants/widget-events.constants';

/**
 * A number field (with the browser's up and down steps). What's typed is kept as typed; its
 * change trigger fires once a number is committed (Enter, leaving the field, or a step).
 */
@Component({
  selector: 'app-number-widget',
  templateUrl: './number-widget.html',
  styleUrl: './number-widget.scss',
})
export class NumberWidget extends BaseFieldWidget {
  protected readonly kind = 'number';

  readonly placeholder = computed(() => this.text('placeholder') ?? '');
  readonly step = computed(() => this.text('step') ?? 'any');
  readonly min = computed(() => this.text('min') ?? null);
  readonly max = computed(() => this.text('max') ?? null);

  onInput(value: string): void {
    this.setValue(value, false);
  }

  onChange(): void {
    this.fire(CHANGE_EVENT);
  }
}
