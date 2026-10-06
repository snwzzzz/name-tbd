import { Component, computed } from '@angular/core';
import { BaseFieldWidget } from '../_shared/base-field-widget';

/** A date field with the browser's calendar; its value is the date as YYYY-MM-DD. Picking one fires its change trigger. */
@Component({
  selector: 'app-date-widget',
  templateUrl: './date-widget.html',
  styleUrl: './date-widget.scss',
})
export class DateWidget extends BaseFieldWidget {
  protected readonly kind = 'date';

  readonly min = computed(() => this.text('min') ?? null);
  readonly max = computed(() => this.text('max') ?? null);
}
