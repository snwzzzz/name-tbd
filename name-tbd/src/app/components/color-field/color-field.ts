import { Component, computed, input, output, signal } from '@angular/core';
import { normalizeHex } from '../../_utils/color.utils';

/**
 * A color setting: a swatch that opens the browser's color picker, the hex value to type into
 * (#rgb or #rrggbb, # optional; anything else goes back to the current value), and a reset.
 * '' is "no color of its own" (shown as `emptyLabel`), when `clearable`.
 */
@Component({
  selector: 'app-color-field',
  template: `
    <div class="ui-color">
      <input type="color" [value]="swatch()" [attr.aria-label]="label() + ' (color picker)'" (input)="pick($any($event.target).value)" />
      <input
        class="ui-color-hex"
        type="text"
        spellcheck="false"
        maxlength="7"
        [attr.aria-label]="label() + ' (hex)'"
        [placeholder]="emptyLabel()"
        [value]="draft() ?? value()"
        (input)="draft.set($any($event.target).value)"
        (keydown.enter)="commit($any($event.target))"
        (keydown.escape)="draft.set(null); $any($event.target).value = value()"
        (blur)="commit($any($event.target))" />
      @if (resetTo() !== null) {
        <button type="button" class="ui-color-reset" [title]="resetTo() ? 'Back to ' + resetTo() : 'Back to ' + emptyLabel()" (click)="changed.emit(resetTo()!)">×</button>
      }
    </div>
  `,
})
export class ColorField {
  /** The color ('' for none of its own). */
  readonly value = input.required<string>();
  /** The color it goes back to on reset ('' for none); no reset while it's that already. */
  readonly defaultValue = input('');
  readonly emptyLabel = input('Auto');
  readonly label = input('Color');
  readonly changed = output<string>();

  /** What's being typed, until it's committed (null: showing the value). */
  readonly draft = signal<string | null>(null);
  /** The picker can't show "none": white then. */
  readonly swatch = computed(() => normalizeHex(this.value()) ?? '#ffffff');
  readonly resetTo = computed(() => (this.value() !== this.defaultValue() ? this.defaultValue() : null));

  pick(color: string): void {
    this.draft.set(null);
    this.changed.emit(color);
  }

  /** Takes what's typed if it's a color; else the field shows the current value again. */
  commit(field: HTMLInputElement): void {
    const draft = this.draft();
    if (draft === null) return;
    this.draft.set(null);
    const color = draft.trim() === '' ? (this.defaultValue() === '' ? '' : null) : normalizeHex(draft);
    // Set by hand: the bound value may not have changed, so Angular wouldn't write it back
    field.value = color ?? this.value();
    if (color !== null && color !== this.value()) this.changed.emit(color);
  }
}
