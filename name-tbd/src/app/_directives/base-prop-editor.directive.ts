import { Directive, computed, inject, input } from '@angular/core';
import { SelectionService } from '../_services/selection.service';
import { WidgetProps } from '../_types/layout.types';
import { WidgetPropDefinition } from '../_types/widget.types';

/**
 * Base of an editor for one prop type in the generated settings (see PROP_EDITORS), for props the
 * built-in inputs can't edit. It gets the prop's definition and all of the widget's props.
 */
@Directive()
export abstract class BasePropEditor {
  private readonly selection = inject(SelectionService);

  readonly def = input.required<WidgetPropDefinition>();
  readonly props = input.required<WidgetProps | undefined>();
  /** The widget whose prop it edits (null: the one selected last). */
  readonly itemId = input<string | null>(null);

  /** The prop's current value, or its default. */
  readonly value = computed(() => this.props()?.[this.def().propKey] ?? this.def().defaultValue);

  /** Sets the prop (and optionally others that depend on it) on its widget. */
  protected update(value: unknown, others: WidgetProps = {}): void {
    this.selection.updateProps({ ...this.props(), ...others, [this.def().propKey]: value }, this.itemId() ?? undefined);
  }
}
