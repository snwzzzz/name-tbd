import { Component, input, booleanAttribute, output } from '@angular/core';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'outline' | 'filled' | 'flushed';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [],
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class Input {
  value = input<string>('');
  valueChange = output<string>();
  placeholder = input<string>('');
  type = input<string>('text');
  size = input<InputSize>('md');
  variant = input<InputVariant>('outline');
  disabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  onInput(event: Event) {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
