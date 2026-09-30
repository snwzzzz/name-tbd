import { Component, booleanAttribute, computed, input, output } from '@angular/core';
import { InputSize, InputVariant } from '../../_types/button.types';

@Component({
  selector: 'app-input',
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class Input {
  readonly value = input('');
  readonly placeholder = input('');
  readonly type = input('text');
  readonly size = input<InputSize>('md');
  readonly variant = input<InputVariant>('outline');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly valueChange = output<string>();

  readonly classes = computed(() => [
    `input-size-${this.size()}`,
    `input-variant-${this.variant()}`,
    this.disabled() ? 'input-disabled' : '',
  ]);

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
