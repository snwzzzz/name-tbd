import { Directive, input, model } from '@angular/core';
import { WidgetProps } from '../_types/layout.types';
import { propText } from '../_utils/widget-props.utils';

/** Base of every widget the canvas places: the canvas sets `id` and `props`. */
@Directive()
export abstract class BaseWidget {
  readonly id = input.required<string>();
  readonly props = model<WidgetProps>({});
  readonly selected = input<boolean>(false);

  /** A prop as text (undefined when it isn't set). */
  protected text(key: string): string | undefined {
    return propText(this.props(), key);
  }
}

/** Base of a widget's hand-written settings panel. */
@Directive()
export abstract class BaseWidgetSettings {
  readonly props = model.required<WidgetProps>();

  protected text(key: string): string {
    return propText(this.props(), key) ?? '';
  }
}
