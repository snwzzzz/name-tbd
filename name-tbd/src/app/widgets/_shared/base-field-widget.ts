import { Directive, computed, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_SESSION } from '../../core/ports/app-ports';
import { InputValuesService } from '../../core/services/input-values.service';
import { FieldErrorsService } from '../../core/services/field-errors.service';
import { WidgetEventsService } from '../../core/services/widget-events.service';
import { FieldKind, validateField } from '../../core/forms/field-validation';
import { CHANGE_EVENT } from '../../_constants/widget-events.constants';
import { propBool } from '../../_utils/widget-props.utils';

/**
 * Base of the widgets something is entered into (dropdown, checkbox, number, ...). While the app
 * runs, the value is kept in InputValuesService (a form saves it into its row, actions read it);
 * until something is entered, the field shows its initial value. An error from a form's
 * validation shows under the field, and goes away as soon as the value is fixed.
 * While editing, the field can't be used, so clicking it selects the widget.
 */
@Directive({ host: { '[class.live]': 'session.live()', '[class.invalid]': '!!error()' } })
export abstract class BaseFieldWidget extends BaseWidget {
  protected readonly session = inject(APP_SESSION);
  protected readonly values = inject(InputValuesService);
  protected readonly errors = inject(FieldErrorsService);
  private readonly widgetEvents = inject(WidgetEventsService);

  /** How the value is checked (see field-validation). */
  protected abstract readonly kind: FieldKind;

  readonly label = computed(() => this.text('label'));
  readonly required = computed(() => propBool(this.props(), 'required', false));
  readonly error = computed(() => this.errors.error(this.id()));
  /** Ids for the field's elements, so its label and error message point at it. */
  readonly fieldId = computed(() => `field-${this.id()}`);
  readonly errorId = computed(() => `field-${this.id()}-error`);
  readonly value = computed(() => this.values.get(this.id()) ?? this.initialValue());
  /** Keyboard focus only while the app runs (while editing, the canvas gets the clicks). */
  readonly tabIndex = computed(() => (this.session.live() ? null : -1));

  /** What the field shows before anything is entered. */
  protected initialValue(): string {
    return '';
  }

  /** Something was entered: keep it, check it again if it was wrong, and fire the change trigger. */
  protected setValue(value: string, fireChange = true): void {
    if (!this.session.live()) return;
    this.values.set(this.id(), value);
    if (this.error()) this.errors.set(this.id(), validateField(this.kind, this.props(), value));
    if (fireChange) this.fire(CHANGE_EVENT);
  }

  protected fire(event: string): void {
    const pageId = this.session.pageId();
    if (this.session.live() && pageId) this.widgetEvents.fire({ pageId, elementId: this.id(), event });
  }
}
