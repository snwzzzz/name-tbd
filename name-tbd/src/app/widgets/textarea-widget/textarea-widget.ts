import { Component, computed } from '@angular/core';
import { BaseFieldWidget } from '../_shared/base-field-widget';

/** A field for longer text, over several lines. */
@Component({
  selector: 'app-textarea-widget',
  templateUrl: './textarea-widget.html',
  styleUrl: './textarea-widget.scss',
})
export class TextareaWidget extends BaseFieldWidget {
  protected readonly kind = 'text';

  readonly placeholder = computed(() => this.text('placeholder') ?? '');
  readonly maxLength = computed(() => this.text('max') ?? null);

  onInput(value: string): void {
    this.setValue(value, false);
  }
}
