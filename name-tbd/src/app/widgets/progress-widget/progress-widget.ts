import { Component, computed } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { propBool, propNumber } from '../../_utils/widget-props.utils';

/** How far along something is: a bar filled to value / maximum, with its label and percentage. */
@Component({
  selector: 'app-progress-widget',
  template: `
    <div class="progress">
      @if (label() || showValue()) {
        <div class="top">
          <span class="label" [id]="labelId()">{{ label() }}</span>
          @if (showValue()) {
            <span class="value" aria-hidden="true">{{ percent() }}%</span>
          }
        </div>
      }
      <div
        class="track"
        role="progressbar"
        aria-valuemin="0"
        [attr.aria-valuemax]="max()"
        [attr.aria-valuenow]="value()"
        [attr.aria-valuetext]="percent() + '%'"
        [attr.aria-labelledby]="label() ? labelId() : null"
        [attr.aria-label]="label() ? null : 'Progress'">
        <div class="fill" [style.width.%]="percent()" [style.background]="color()"></div>
      </div>
    </div>
  `,
  styleUrl: './progress-widget.scss',
})
export class ProgressWidget extends BaseWidget {
  readonly label = computed(() => this.text('label') ?? '');
  readonly labelId = computed(() => `progress-${this.id()}-label`);
  readonly showValue = computed(() => propBool(this.props(), 'showValue', true));
  readonly color = computed(() => this.text('color') ?? null);
  readonly max = computed(() => {
    const max = propNumber(this.props(), 'max', 100);
    return max > 0 ? max : 100;
  });
  readonly value = computed(() => Math.min(this.max(), Math.max(0, propNumber(this.props(), 'value', 0))));
  readonly percent = computed(() => Math.round((this.value() / this.max()) * 100));
}
