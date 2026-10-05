import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import {
  Completion, Completions, ScopeEntry, checkExpression, checkTemplate, completions, isTemplate,
} from '../../../flow-engine';

/** Most completions shown at once. */
const MAX_SHOWN = 8;

/**
 * A field for an expression (`orderForm.amount > approvalLimit`) or a template (text with
 * `{{ expression }}` parts): it completes names, fields and functions as you type (Tab or Enter
 * takes one, Escape closes the list), and says what's wrong with it, right under it.
 *
 * `scope` describes what the expression can use (ExpressionScopeService.entries, plus a flow's own
 * values in the workflow editor).
 */
@Component({
  selector: 'app-expression-input',
  templateUrl: './expression-input.html',
  styleUrl: './expression-input.scss',
  host: { '[class.expression]': "mode() === 'expression'", '[class.invalid]': '!!problem()' },
})
export class ExpressionInput {
  readonly value = input<string>('');
  /** `expression`: the whole text is one; `template`: text that may contain `{{ }}`. */
  readonly mode = input<'expression' | 'template'>('template');
  readonly scope = input<ScopeEntry[]>([]);
  readonly placeholder = input<string>('');
  readonly label = input<string>('');
  /** Several lines (e.g. a request body). */
  readonly multiline = input<boolean>(false);

  readonly valueChange = output<string>();

  private readonly field = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('field');
  private readonly cursor = signal<number | null>(null);
  readonly active = signal(0);
  private readonly dismissed = signal(false);
  // What's typed, ahead of the value coming back from the parent
  private readonly typed = signal<string | null>(null);

  readonly text = computed(() => this.typed() ?? this.value() ?? '');

  /** What's wrong with it (null: nothing). Plain text in a template is fine. */
  readonly problem = computed(() => {
    const text = this.text();
    if (this.mode() === 'expression') return text.trim() ? checkExpression(text, this.scope()) : null;
    return isTemplate(text) ? checkTemplate(text, this.scope()) : null;
  });

  readonly completions = computed<Completions | null>(() => {
    const cursor = this.cursor();
    if (cursor === null || this.dismissed()) return null;
    return completions(this.text(), cursor, this.scope(), this.mode() === 'template');
  });
  readonly shown = computed(() => this.completions()?.items.slice(0, MAX_SHOWN) ?? []);

  onInput(event: Event): void {
    const el = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.typed.set(el.value);
    this.dismissed.set(false);
    this.active.set(0);
    this.cursor.set(el.selectionStart);
    this.valueChange.emit(el.value);
  }

  onCaretMove(event: Event): void {
    const el = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.cursor.set(el.selectionStart);
  }

  onBlur(): void {
    this.cursor.set(null);
    this.typed.set(null);
  }

  onKeydown(event: KeyboardEvent): void {
    const shown = this.shown();
    if (!shown.length) return;
    switch (event.key) {
      case 'ArrowDown':
        this.active.set((this.active() + 1) % shown.length);
        break;
      case 'ArrowUp':
        this.active.set((this.active() - 1 + shown.length) % shown.length);
        break;
      case 'Enter':
      case 'Tab':
        this.accept(shown[this.active()]);
        break;
      case 'Escape':
        this.dismissed.set(true);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /** Replaces what's typed of the name with the completion. */
  accept(item: Completion): void {
    const found = this.completions();
    const el = this.field()?.nativeElement;
    if (!found || !el) return;
    const text = this.text();
    const next = text.slice(0, found.from) + item.insert + text.slice(found.to);
    const caret = found.from + item.insert.length;
    el.value = next;
    el.setSelectionRange(caret, caret);
    this.typed.set(next);
    this.cursor.set(caret);
    this.active.set(0);
    // Closed until something more is typed
    this.dismissed.set(true);
    this.valueChange.emit(next);
  }

  icon(item: Completion): string {
    switch (item.kind) {
      case 'function': case 'method': return 'ƒ';
      case 'variable': return 'x';
      case 'widget': return '▣';
      case 'field': case 'value': return '·';
      case 'keyword': return 'k';
      default: return '$';
    }
  }
}
