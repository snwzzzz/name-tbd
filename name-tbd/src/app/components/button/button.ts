import { Component, booleanAttribute, computed, input } from '@angular/core';
import { ButtonColor, ButtonSize, ButtonVariant } from '../../_types/button.types';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly color = input<ButtonColor>('primary');
  readonly variant = input<ButtonVariant>('solid');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly classes = computed(() => [
    this.disabled() ? 'btn-disabled' : `btn-${this.color()}`,
    `btn-size-${this.size()}`,
    `btn-variant-${this.variant()}`,
  ]);
}
